// services/capture/capture.service.ts

import { createClient } from '@/lib/supabase/client'
import { checkAIQuota, trackAIUsage } from '@/services/quota'
import type { ItemType, ItemState, AIAnalysis } from '@/types/items'

// ============================================
// TYPES
// ============================================

// Item multi-pensée retourné par l'API
export interface MultiThoughtItem {
  content: string
  type_suggestion: ItemType
  confidence: number
  extracted_data: {
    context?: 'personal' | 'family' | 'work' | 'health' | 'other'
    date?: string
    time?: string
    duration?: number
    items?: string[]
    category?: string
  }
  suggestions: string[]
}

export interface CaptureResult {
  success: boolean
  aiUsed: boolean
  multiple?: boolean
  items?: MultiThoughtItem[]
  suggestedType?: ItemType
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
  context?: 'personal' | 'family' | 'work' | 'health' | 'other'
  listId?: string // Pour list_item
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
  content: string
): Promise<CaptureResult> {
  console.log('🔍 [captureThought] START - userId:', userId, 'content:', content.substring(0, 50))

  try {
    // 1. Vérifier le quota IA
    console.log('🔍 [captureThought] Checking AI quota...')
    const quota = await checkAIQuota(userId)
    console.log('🔍 [captureThought] Quota result:', quota)

    // 2. Si quota OK → Analyser avec IA
    if (quota.canUse) {
      console.log('🔍 [captureThought] Quota OK, calling /api/analyze...')
      try {
        // Appel API d'analyse
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        })

        console.log('🔍 [captureThought] API response status:', response.status)

        if (!response.ok) {
          throw new Error('API analyze failed')
        }

        const analysis = await response.json()
        console.log('🔍 [captureThought] Analysis result:', analysis)

        // Tracker l'usage (incrémenter compteur)
        await trackAIUsage(userId, 'analyze')

        // Gérer multi-pensées
        if (analysis.multiple && Array.isArray(analysis.items)) {
          const multiResult: CaptureResult = {
            success: true,
            aiUsed: true,
            multiple: true,
            items: analysis.items,
            creditsRemaining: quota.creditsRemaining ? quota.creditsRemaining - 1 : null
          }
          console.log('🔍 [captureThought] Returning MULTI-THOUGHTS:', multiResult)
          return multiResult
        }

        // Pensée simple
        const result: CaptureResult = {
          success: true,
          aiUsed: true,
          suggestedType: analysis.type_suggestion,
          aiAnalysis: analysis,
          creditsRemaining: quota.creditsRemaining ? quota.creditsRemaining - 1 : null
        }
        console.log('🔍 [captureThought] Returning SUCCESS with AI:', result)
        return result
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

  // Si list_item, gérer la liste de courses
  if (input.type === 'list_item') {
    if (!input.listId) {
      // Créer ou récupérer la liste par défaut
      const listId = await getOrCreateDefaultShoppingList(input.userId)
      itemData.list_id = listId
    } else {
      itemData.list_id = input.listId
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

  return data.id
}

// ============================================
// HELPER : Gérer la liste de courses
// ============================================

async function getOrCreateDefaultShoppingList(userId: string): Promise<string> {
  const supabase = createClient()

  // Chercher une liste active
  const { data: existingList } = await supabase
    .from('shopping_lists')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (existingList) {
    return existingList.id
  }

  // Créer une nouvelle liste
  const { data: newList, error } = await supabase
    .from('shopping_lists')
    .insert({
      user_id: userId,
      name: 'Courses',
      status: 'active'
    })
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
 * Ex: "ajouter le lait à la liste de course" → ['Lait']
 * Ex: "acheter banane au course" → ['Banane']
 */
export function extractMultipleItems(content: string): string[] {
  // Split par virgules, retours à la ligne, ou "et"
  const rawItems = content
    .split(/[,\n]|(?:\s+et\s+)/i)
    .map(item => item.trim())
    .filter(item => item.length > 0)

  // Nettoyer chaque item
  const cleanedItems = rawItems.map(item => {
    let cleaned = item

    // 1. Enlever les verbes d'achat au début
    cleaned = cleaned.replace(/^(acheter|prendre|récupérer|chercher|ajouter)\s+/i, '').trim()

    // 2. Enlever les articles au début
    cleaned = cleaned.replace(/^(du|de la|des|de l'|d'|le|la|les|un|une)\s+/i, '').trim()

    // 3. Enlever les expressions liées aux courses (à la fin ou milieu)
    cleaned = cleaned.replace(/\s*(à|au|aux|dans|pour)\s+(la|le|les)?\s*(liste|course|courses|panier|caddie).*$/i, '').trim()

    // 4. Re-nettoyer les articles si nouvelle phrase
    cleaned = cleaned.replace(/^(du|de la|des|de l'|d'|le|la|les|un|une)\s+/i, '').trim()

    // 5. Capitaliser première lettre
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
