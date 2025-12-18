import { createClient } from '@/lib/supabase/client'
import type {
  ShoppingList,
  ShoppingListStatus,
  CreateShoppingListInput,
  UpdateShoppingListInput,
  ShoppingListFilters,
  ShoppingListWithItems
} from '@/types/shopping-lists'
import type { Item } from '@/types/items'

function getSupabase() {
  return createClient()
}

async function getCurrentUserId(): Promise<string> {
  const supabase = getSupabase()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('User not authenticated')
  }

  return user.id
}

// ============================================
// CREATE
// ============================================

export async function createShoppingList(input?: CreateShoppingListInput): Promise<ShoppingList> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('shopping_lists')
    .insert({
      user_id: userId,
      name: input?.name || 'Courses',
      scheduled_at: input?.scheduled_at || null,
      status: input?.status || 'active'
    })
    .select()
    .single()

  if (error) throw error
  return data as ShoppingList
}

// ============================================
// READ
// ============================================

export async function getShoppingList(id: string): Promise<ShoppingList | null> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }

  return data as ShoppingList
}

export async function getShoppingLists(filters?: ShoppingListFilters): Promise<ShoppingList[]> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()

  let query = supabase
    .from('shopping_lists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status)
    } else {
      query = query.eq('status', filters.status)
    }
  }

  if (filters?.has_scheduled !== undefined) {
    if (filters.has_scheduled) {
      query = query.not('scheduled_at', 'is', null)
    } else {
      query = query.is('scheduled_at', null)
    }
  }

  const { data, error } = await query

  if (error) throw error
  return data as ShoppingList[]
}

export async function getActiveShoppingLists(): Promise<ShoppingList[]> {
  return getShoppingLists({ status: 'active' })
}

export async function getShoppingListWithItems(id: string): Promise<ShoppingListWithItems | null> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()

  // Récupérer la liste
  const { data: list, error: listError } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (listError) {
    if (listError.code === 'PGRST116') return null
    throw listError
  }

  // Récupérer les items de la liste
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('*')
    .eq('list_id', id)
    .eq('user_id', userId)
    .eq('type', 'list_item')
    .order('created_at', { ascending: true })

  if (itemsError) throw itemsError

  return {
    ...list,
    items: items || []
  } as ShoppingListWithItems
}

/**
 * Récupère ou crée la liste de courses par défaut de l'utilisateur
 */
export async function getOrCreateDefaultShoppingList(): Promise<ShoppingList> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()

  // Chercher une liste active existante nommée "Courses"
  const { data: existingList, error: fetchError } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('user_id', userId)
    .eq('name', 'Courses')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (existingList) {
    return existingList as ShoppingList
  }

  // Si pas de liste, en créer une
  if (fetchError?.code === 'PGRST116') {
    return createShoppingList({ name: 'Courses' })
  }

  // Si erreur autre que "not found", la propager
  if (fetchError) throw fetchError

  // Ce cas ne devrait pas arriver, mais au cas où
  return createShoppingList({ name: 'Courses' })
}

// ============================================
// UPDATE
// ============================================

export async function updateShoppingList(
  id: string,
  updates: UpdateShoppingListInput
): Promise<ShoppingList> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('shopping_lists')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data as ShoppingList
}

export async function updateShoppingListStatus(
  id: string,
  status: ShoppingListStatus
): Promise<ShoppingList> {
  return updateShoppingList(id, { status })
}

export async function markShoppingListCompleted(id: string): Promise<ShoppingList> {
  return updateShoppingListStatus(id, 'completed')
}

export async function markShoppingListArchived(id: string): Promise<ShoppingList> {
  return updateShoppingListStatus(id, 'archived')
}

export async function scheduleShoppingList(
  id: string,
  scheduledAt: string,
  googleEventId?: string
): Promise<ShoppingList> {
  return updateShoppingList(id, {
    scheduled_at: scheduledAt,
    google_event_id: googleEventId
  })
}

// ============================================
// DELETE
// ============================================

export async function deleteShoppingList(id: string): Promise<void> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()

  // Supprimer d'abord les items liés
  const { error: itemsError } = await supabase
    .from('items')
    .delete()
    .eq('list_id', id)
    .eq('user_id', userId)

  if (itemsError) throw itemsError

  // Puis supprimer la liste
  const { error } = await supabase
    .from('shopping_lists')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw error
}

// ============================================
// HELPERS COMBINÉS (Items + Lists)
// ============================================

/**
 * Ajoute un item à la liste de courses par défaut
 */
export async function addToDefaultShoppingList(content: string): Promise<Item> {
  const supabase = getSupabase()
  const userId = await getCurrentUserId()

  // Récupérer ou créer la liste par défaut
  const defaultList = await getOrCreateDefaultShoppingList()

  // Créer l'item
  const { data, error } = await supabase
    .from('items')
    .insert({
      user_id: userId,
      type: 'list_item',
      state: 'active',
      content,
      list_id: defaultList.id,
      metadata: {}
    })
    .select()
    .single()

  if (error) throw error
  return data as Item
}

/**
 * Ajoute plusieurs items à la liste de courses par défaut
 */
export async function addMultipleToDefaultShoppingList(contents: string[]): Promise<Item[]> {
  const supabase = getSupabase()
  const userId = await getCurrentUserId()

  // Récupérer ou créer la liste par défaut
  const defaultList = await getOrCreateDefaultShoppingList()

  // Créer les items
  const itemsToInsert = contents.map(content => ({
    user_id: userId,
    type: 'list_item' as const,
    state: 'active' as const,
    content,
    list_id: defaultList.id,
    metadata: {}
  }))

  const { data, error } = await supabase
    .from('items')
    .insert(itemsToInsert)
    .select()

  if (error) throw error
  return data as Item[]
}
