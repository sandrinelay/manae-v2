// services/capture/capture.service.ts

import { createClient } from '@/lib/supabase/client'
import { checkAIQuota, trackAIUsage } from '@/services/quota'
import type { ItemType, ItemState, AIAnalysis } from '@/types/items'

// ============================================
// TYPES
// ============================================

export interface CaptureResult {
  success: boolean
  aiUsed: boolean
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
  mood?: 'energetic' | 'neutral' | 'tired'
  context?: 'personal' | 'family' | 'work' | 'health'
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

        const analysis: AIAnalysis = await response.json()
        console.log('🔍 [captureThought] Analysis result:', analysis)

        // Tracker l'usage (incrémenter compteur)
        await trackAIUsage(userId, 'analyze')

        const result = {
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
  const itemData: Record<string, unknown> = {
    user_id: input.userId,
    type: input.type,
    state: input.state || 'active',
    content: input.content,
    ai_analysis: input.aiAnalysis || null,
    mood: input.mood || null,
    context: input.context || null,
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
 * Pour les courses : "lait pain oeufs" → ['lait', 'pain', 'oeufs']
 */
export function extractMultipleItems(content: string): string[] {
  // Split par virgules, retours à la ligne, ou espaces multiples
  const items = content
    .split(/[,\n]+/)
    .map(item => item.trim())
    .filter(item => item.length > 0)

  // Si pas de virgules/retours, split par espaces simples
  if (items.length === 1) {
    return content
      .split(/\s+/)
      .map(item => item.trim())
      .filter(item => item.length > 1) // Ignorer les mots d'1 lettre
  }

  return items
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
