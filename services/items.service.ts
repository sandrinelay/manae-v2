import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Item, ItemType, ItemState, ItemContext } from '@/types/items'
import { deleteCalendarEvent } from '@/features/schedule/services/calendar.service'

// ============================================
// ITEMS SERVICE
// Toutes les opérations CRUD sur les items
// ============================================

function getSupabase() {
  return createClient()
}

/**
 * Supprime l'événement Google Calendar associé à un item (si existant)
 * Ne bloque pas en cas d'erreur (l'événement peut avoir été supprimé manuellement)
 */
async function deleteAssociatedCalendarEvent(googleEventId: string | null | undefined): Promise<void> {
  if (!googleEventId) return

  try {
    await deleteCalendarEvent(googleEventId)
    console.log(`[items.service] Événement Google Calendar supprimé: ${googleEventId}`)
  } catch (error) {
    // Non-bloquant : l'événement peut avoir été supprimé manuellement
    console.warn(`[items.service] Impossible de supprimer l'événement Calendar (ignoré):`, error)
  }
}

/**
 * Récupère le google_event_id d'un item
 */
async function getItemGoogleEventId(id: string): Promise<string | null> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('items')
    .select('google_event_id')
    .eq('id', id)
    .single()

  return data?.google_event_id || null
}

async function getCurrentUserId(): Promise<string> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  return user.id
}

// ============ FETCH ============

export async function fetchItemsByType(type: ItemType): Promise<Item[]> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data as Item[]
}

export async function fetchTasks(): Promise<Item[]> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'task')
    .is('parent_id', null)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data as Item[]
}

export async function fetchIdeas(): Promise<Item[]> {
  return fetchItemsByType('idea')
}

export async function fetchNotes(): Promise<Item[]> {
  return fetchItemsByType('note')
}

// ============ UPDATE STATE ============

export async function updateItemState(id: string, state: ItemState): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('items')
    .update({
      state,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) throw error

  // Notifier que les données ont changé (pour rafraîchir Clarté)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('clarte-data-changed'))
  }
}

export async function archiveItem(id: string): Promise<void> {
  // Supprimer l'événement Calendar associé si existant
  const googleEventId = await getItemGoogleEventId(id)
  if (googleEventId) {
    await deleteAssociatedCalendarEvent(googleEventId)
  }
  return updateItemState(id, 'archived')
}

export async function activateItem(id: string): Promise<void> {
  return updateItemState(id, 'active')
}

export async function completeItem(id: string): Promise<void> {
  // Supprimer l'événement Calendar associé si existant
  const googleEventId = await getItemGoogleEventId(id)
  if (googleEventId) {
    await deleteAssociatedCalendarEvent(googleEventId)
  }
  return updateItemState(id, 'completed')
}

// ============ UPDATE CONTENT ============

// ============================================
// DÉTECTION CORRECTION IA (helper interne)
// ============================================

const CORRECTION_WINDOW_MINUTES = 10

/**
 * Détecte si une mise à jour de type/contexte est une correction rapide de l'IA.
 * Si oui, enregistre silencieusement dans user_ai_memory.
 * Fire-and-forget : ne bloque jamais la mise à jour principale.
 */
async function detectAndRecordCorrection(
  supabase: SupabaseClient,
  itemId: string,
  updates: { content: string; context?: ItemContext; type?: ItemType }
): Promise<void> {
  // Récupérer l'item original avec created_at et valeurs actuelles
  const { data: original } = await supabase
    .from('items')
    .select('user_id, type, context, created_at')
    .eq('id', itemId)
    .single()

  if (!original) return

  // Vérifier que c'est dans la fenêtre de correction (10 min)
  const createdAt = new Date(original.created_at).getTime()
  const now = Date.now()
  const ageMinutes = (now - createdAt) / 1000 / 60
  if (ageMinutes > CORRECTION_WINDOW_MINUTES) return

  // Vérifier qu'il y a effectivement un changement
  const hasTypeChange = updates.type !== undefined && updates.type !== original.type
  const hasContextChange = updates.context !== undefined && updates.context !== original.context
  if (!hasTypeChange && !hasContextChange) return

  const { recordCorrection } = await import('@/services/ai/memory.service')

  await recordCorrection(supabase, original.user_id, itemId, {
    oldType: original.type,
    newType: updates.type,
    oldContext: original.context,
    newContext: updates.context,
    content: updates.content
  })
}

/**
 * Met à jour le contenu d'un item et optionnellement son contexte et/ou type.
 * Quand context ou type est passé, déclenche silencieusement la détection
 * de correction IA (fire-and-forget, < 10 min après création).
 *
 * ⚠️ ÉCRITURE DB : si `type` est passé, il est bien écrit en base.
 *    Les callers existants (2 ou 3 args) ne sont pas affectés.
 */
export async function updateItemContent(
  id: string,
  content: string,
  context?: ItemContext,
  type?: ItemType
): Promise<void> {
  const supabase = getSupabase()

  // Détecter les corrections de classification (type ou contexte changé rapidement)
  if (context !== undefined || type !== undefined) {
    detectAndRecordCorrection(supabase, id, { content, context, type })
      .catch(err => console.warn('[items] detectAndRecordCorrection failed:', err))
  }

  const updateData: Record<string, unknown> = {
    content,
    updated_at: new Date().toISOString()
  }

  if (context !== undefined) updateData.context = context
  if (type !== undefined) updateData.type = type

  const { error } = await supabase
    .from('items')
    .update(updateData)
    .eq('id', id)

  if (error) throw error
}

// ============ DELETE ============

export async function deleteItem(id: string): Promise<void> {
  const supabase = getSupabase()

  // Supprimer l'événement Calendar associé si existant
  const googleEventId = await getItemGoogleEventId(id)
  if (googleEventId) {
    await deleteAssociatedCalendarEvent(googleEventId)
  }

  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)

  if (error) throw error

  // Notifier que les données ont changé (pour rafraîchir Clarté)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('clarte-data-changed'))
  }
}

// ============ FETCH SINGLE ITEM ============

export async function fetchItemById(id: string): Promise<Item | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('items')
    .select('type, state')
    .eq('id', id)
    .single()

  if (error) return null
  return data as Item
}

// ============ PROJECTS ============

export async function fetchProject(projectId: string, userId: string): Promise<Item | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .eq('state', 'project')
    .single()

  if (error || !data) return null
  return data as Item
}

export async function fetchProjectSteps(projectId: string, userId: string): Promise<Item[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('parent_id', projectId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as Item[]
}

// ============ SERVICE OBJECT (alternative pattern) ============

export const itemsService = {
  // Fetch
  fetchTasks,
  fetchIdeas,
  fetchNotes,
  fetchItemsByType,
  fetchItemById,
  fetchProject,
  fetchProjectSteps,

  // State updates
  updateItemState,
  archiveItem,
  activateItem,
  completeItem,

  // Content updates
  updateItemContent,

  // Delete
  deleteItem
}
