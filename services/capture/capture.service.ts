// services/capture/capture.service.ts

import { createClient } from '@/lib/supabase/client'
import { checkAIQuota, trackAIUsage } from '@/services/quota'
import type { ItemType, ItemState, ItemContext, AIAnalysis } from '@/types/items'
import { detectShoppingCategory } from '@/config/shopping-categories'

// ============================================
// TYPES
// ============================================

// Item multi-pensée retourné par l'API v2
export interface MultiThoughtItem {
  content: string
  type: ItemType
  state: ItemState
  context?: ItemContext
  ai_analysis: AIAnalysis
}

export interface CaptureResult {
  success: boolean
  aiUsed: boolean
  multiple?: boolean
  items?: MultiThoughtItem[]
  suggestedType?: ItemType
  suggestedContext?: ItemContext
  aiAnalysis?: AIAnalysis
  creditsRemaining?: number | null
  quotaExceeded?: boolean
  error?: string
}

export interface SaveItemInput {
  userId: string
  type: ItemType
  content: string
  state?: ItemState
  aiAnalysis?: AIAnalysis
  mood?: 'energetic' | 'neutral' | 'overwhelmed' | 'tired'
  context?: ItemContext
  listId?: string // Pour list_item
  shoppingCategory?: string // Catégorie pour list_item
}

// ============================================
// CAPTURE THOUGHT (sans sauvegarde DB)
// ============================================

/**
 * Capture une pensée et l'analyse avec l'IA si quota disponible
 * NE SAUVEGARDE PAS en DB - juste retourne l'analyse
 */
export async function captureThought(
  userId: string,
  content: string,
  source?: 'voice' | 'text'
): Promise<CaptureResult> {
  console.log('🔍 [captureThought] START - userId:', userId, 'content:', content.substring(0, 50))

  try {
    // 1. Vérifier le quota IA
    console.log('🔍 [captureThought] Checking AI quota...')
    const quota = await checkAIQuota(userId)
    console.log('🔍 [captureThought] Quota result:', quota)

    // 2. Si quota OK → Analyser avec IA (API v2 avec temporal_constraint)
    if (quota.canUse) {
      console.log('🔍 [captureThought] Quota OK, calling /api/analyze-v2...')
      try {
        // Appel API d'analyse v2
        const response = await fetch('/api/analyze-v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText: content, source })
        })

        console.log('🔍 [captureThought] API response status:', response.status)

        if (!response.ok) {
          throw new Error('API analyze failed')
        }

        const analysisResult = await response.json()
        console.log('🔍 [captureThought] Analysis result:', analysisResult)

        // Tracker l'usage (incrémenter compteur)
        await trackAIUsage(userId, 'analyze')

        // Gérer multi-pensées (API v2 retourne toujours { items: [...] })
        if (analysisResult.items && Array.isArray(analysisResult.items)) {
          const items = analysisResult.items as MultiThoughtItem[]

          if (items.length > 1) {
            // Multi-pensées
            const multiResult: CaptureResult = {
              success: true,
              aiUsed: true,
              multiple: true,
              items: items,
              creditsRemaining: quota.creditsRemaining ? quota.creditsRemaining - 1 : null
            }
            console.log('🔍 [captureThought] Returning MULTI-THOUGHTS:', multiResult)
            return multiResult
          }

          // Pensée unique
          const firstItem = items[0]
          const result: CaptureResult = {
            success: true,
            aiUsed: true,
            suggestedType: firstItem.type,
            suggestedContext: firstItem.context,
            aiAnalysis: firstItem.ai_analysis,
            creditsRemaining: quota.creditsRemaining ? quota.creditsRemaining - 1 : null
          }
          console.log('🔍 [captureThought] Returning SUCCESS with AI:', result)
          return result
        }

        // Fallback si pas d'items
        throw new Error('Invalid API response: no items')
      } catch (error) {
        console.error('🔍 [captureThought] Error analyzing thought:', error)

        // Si l'API IA échoue, continuer sans IA
        const fallbackResult = {
          success: true,
          aiUsed: false,
          quotaExceeded: false,
          error: 'AI analysis failed, please categorize manually'
        }
        console.log('🔍 [captureThought] Returning FALLBACK (AI failed):', fallbackResult)
        return fallbackResult
      }
    }

    // 3. Si quota épuisé → Pas d'analyse IA
    const quotaExceededResult = {
      success: true,
      aiUsed: false,
      quotaExceeded: true,
      creditsRemaining: 0
    }
    console.log('🔍 [captureThought] Quota exceeded, returning:', quotaExceededResult)
    return quotaExceededResult
  } catch (error) {
    console.error('🔍 [captureThought] CRITICAL ERROR:', error)
    const errorResult = {
      success: false,
      aiUsed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
    console.log('🔍 [captureThought] Returning ERROR result:', errorResult)
    return errorResult
  }
}

// ============================================
// SAVE ITEM (après validation user)
// ============================================

/**
 * Sauvegarde l'item en DB après validation de l'utilisateur dans la modal
 * C'est la SEULE fonction qui écrit en DB
 */
export async function saveItem(input: SaveItemInput): Promise<string> {
  const supabase = createClient()

  // Préparer les données
  // Contexte : priorité input > AI extracted_data > fallback 'other'
  const resolvedContext = input.context
    || input.aiAnalysis?.extracted_data?.context
    || 'other'

  const itemData: Record<string, unknown> = {
    user_id: input.userId,
    type: input.type,
    state: input.state || 'active',
    content: input.content,
    ai_analysis: input.aiAnalysis || null,
    mood: input.mood || null,
    context: resolvedContext,
    metadata: {
      categorized_by: input.aiAnalysis ? 'ai' : 'user'
    }
  }

  // Si list_item, gérer la liste de courses et la catégorie
  if (input.type === 'list_item') {
    if (!input.listId) {
      // Créer ou récupérer la liste par défaut
      const listId = await getOrCreateDefaultShoppingList(input.userId)
      itemData.list_id = listId
    } else {
      itemData.list_id = input.listId
    }
    // Ajouter la catégorie (priorité: input > AI extracted_data)
    const category = input.shoppingCategory
      || input.aiAnalysis?.extracted_data?.category
      || null
    if (category) {
      itemData.shopping_category = category
    }
  }

  // Insérer en DB
  const { data, error } = await supabase
    .from('items')
    .insert(itemData)
    .select('id')
    .single()

  if (error) {
    console.error('Error saving item:', error)
    throw error
  }

  // Notifier que les données ont changé (pour rafraîchir Clarté)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('clarte-data-changed'))
  }

  return data.id
}

// ============================================
// HELPER : Gérer la liste de courses
// ============================================

async function getOrCreateDefaultShoppingList(userId: string): Promise<string> {
  const supabase = createClient()

  // Retourner la liste "alimentaire" de l'utilisateur
  const { data: list } = await supabase
    .from('lists')
    .select('id')
    .eq('user_id', userId)
    .eq('slug', 'alimentaire')
    .single()

  if (list) return list.id

  // Fallback : créer la liste alimentaire si absente (ne devrait pas arriver)
  const { data: newList, error } = await supabase
    .from('lists')
    .insert({ user_id: userId, name: 'Alimentaire', slug: 'alimentaire', position: 1, enabled: true })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating shopping list:', error)
    throw error
  }

  return newList.id
}

// ============================================
// HELPER : Extraire multiple items d'un contenu
// ============================================

/**
 * Nettoie et extrait plusieurs items d'un contenu
 * Enlève tous les mots parasites liés aux courses
 *
 * Patterns supportés :
 * - "acheter lait pain œufs" → ['Lait', 'Pain', 'Œufs'] (espaces)
 * - "lait, pain, œufs" → ['Lait', 'Pain', 'Œufs'] (virgules)
 * - "lait et pain et œufs" → ['Lait', 'Pain', 'Œufs'] (et)
 * - "ajouter le lait à la liste de course" → ['Lait']
 */
export function extractMultipleItems(content: string): string[] {
  // 1. Nettoyer le contenu global d'abord
  let cleanedContent = content

  // Enlever les verbes d'achat au début
  cleanedContent = cleanedContent.replace(/^(acheter|prendre|récupérer|chercher|ajouter)\s+/i, '').trim()

  // Enlever les expressions liées aux courses à la fin
  cleanedContent = cleanedContent.replace(/\s*(à|au|aux|dans|pour)\s+(la|le|les)?\s*(liste|course|courses|panier|caddie).*$/i, '').trim()

  // 2. Détecter le type de séparateur utilisé
  const hasCommas = cleanedContent.includes(',')
  const hasEt = /\s+et\s+/i.test(cleanedContent)

  let rawItems: string[]

  if (hasCommas) {
    // Split par virgules
    rawItems = cleanedContent.split(',').map(item => item.trim()).filter(item => item.length > 0)
  } else if (hasEt) {
    // Split par "et"
    rawItems = cleanedContent.split(/\s+et\s+/i).map(item => item.trim()).filter(item => item.length > 0)
  } else {
    // Pas de séparateur évident → essayer de détecter une liste séparée par espaces
    // On split par espaces et on filtre les articles/mots vides
    const words = cleanedContent.split(/\s+/)
    const stopWords = new Set([
      'du', 'de', 'la', 'des', 'le', 'les', 'un', 'une', 'l', 'd',
      'et', 'ou', 'avec', 'sans', 'pour', 'dans', 'sur', 'sous'
    ])

    // Filtrer les stop words et garder les mots substantifs
    rawItems = words.filter(word => {
      const lowerWord = word.toLowerCase().replace(/['']/g, '')
      return word.length > 1 && !stopWords.has(lowerWord)
    })

    // Si on a moins de 2 items après filtrage, garder le contenu original comme un seul item
    if (rawItems.length < 2) {
      rawItems = [cleanedContent]
    }
  }

  // 3. Nettoyer chaque item individuellement
  const cleanedItems = rawItems.map(item => {
    let cleaned = item

    // Enlever les articles au début
    cleaned = cleaned.replace(/^(du|de la|des|de l'|d'|le|la|les|un|une)\s+/i, '').trim()

    // Enlever les verbes d'achat résiduels
    cleaned = cleaned.replace(/^(acheter|prendre|récupérer|chercher|ajouter)\s+/i, '').trim()

    // Re-nettoyer les articles si présents après le verbe
    cleaned = cleaned.replace(/^(du|de la|des|de l'|d'|le|la|les|un|une)\s+/i, '').trim()

    // Capitaliser première lettre
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase()
    }

    return cleaned
  }).filter(item => item.length > 1) // Ignorer items trop courts

  return cleanedItems
}

// ============================================
// SAVE MULTIPLE LIST ITEMS
// ============================================

/**
 * Sauvegarde plusieurs items de courses d'un coup
 * Détecte automatiquement la catégorie de chaque item
 */
export async function saveMultipleListItems(
  userId: string,
  items: string[],
  aiAnalysis?: AIAnalysis
): Promise<string[]> {
  const supabase = createClient()
  const listId = await getOrCreateDefaultShoppingList(userId)

  const itemsData = items.map(item => ({
    user_id: userId,
    type: 'list_item' as ItemType,
    state: 'active' as ItemState,
    content: item,
    list_id: listId,
    shopping_category: detectShoppingCategory(item),
    ai_analysis: aiAnalysis || null,
    metadata: {
      categorized_by: aiAnalysis ? 'ai' : 'user'
    }
  }))

  const { data, error } = await supabase
    .from('items')
    .insert(itemsData)
    .select('id')

  if (error) {
    console.error('Error saving list items:', error)
    throw error
  }

  return data.map(item => item.id)
}
