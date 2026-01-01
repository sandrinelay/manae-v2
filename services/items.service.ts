import { createClient } from '@/lib/supabase/client'
import type { Item, ItemType, ItemState, ItemContext } from '@/types/items'

// ============================================
// ITEMS SERVICE
// Toutes les opérations CRUD sur les items
// ============================================

function getSupabase() {
  return createClient()
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
}

export async function archiveItem(id: string): Promise<void> {
  return updateItemState(id, 'archived')
}

export async function activateItem(id: string): Promise<void> {
  return updateItemState(id, 'active')
}

export async function completeItem(id: string): Promise<void> {
  return updateItemState(id, 'completed')
}

// ============ UPDATE CONTENT ============

export async function updateItemContent(
  id: string,
  content: string,
  context?: ItemContext
): Promise<void> {
  const supabase = getSupabase()

  const updateData: Record<string, unknown> = {
    content,
    updated_at: new Date().toISOString()
  }

  if (context !== undefined) {
    updateData.context = context
  }

  const { error } = await supabase
    .from('items')
    .update(updateData)
    .eq('id', id)

  if (error) throw error
}

// ============ DELETE ============

export async function deleteItem(id: string): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)

  if (error) throw error
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
