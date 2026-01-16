import { createClient } from '@/lib/supabase/client'
import type { Item, ShoppingCategory } from '@/types/items'
import type { ShoppingList } from '@/types/shopping-lists'

// ============================================
// SHOPPING SERVICE
// Opérations sur les listes de courses
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

export async function fetchActiveShoppingList(): Promise<ShoppingList | null> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return data as ShoppingList
}

export async function fetchShoppingListItems(listId: string): Promise<Item[]> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'list_item')
    .eq('list_id', listId)
    .eq('state', 'active')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as Item[]
}

export async function fetchAllShoppingItems(): Promise<Item[]> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'list_item')
    .in('state', ['active', 'completed'])
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Item[]
}

// ============ CREATE ============

export async function addShoppingItem(listId: string, content: string): Promise<void> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()

  const { error } = await supabase.from('items').insert({
    user_id: userId,
    type: 'list_item',
    state: 'active',
    content: content.trim(),
    list_id: listId
  })

  if (error) throw error
}

// ============ UPDATE ============

export async function toggleShoppingItem(id: string, currentState: string): Promise<void> {
  const supabase = getSupabase()
  const newState = currentState === 'completed' ? 'active' : 'completed'

  const { error } = await supabase
    .from('items')
    .update({ state: newState, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function updateShoppingItem(
  id: string,
  content: string,
  category: ShoppingCategory
): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('items')
    .update({
      content,
      shopping_category: category,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) throw error
}

export async function renameShoppingList(listId: string, name: string): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('shopping_lists')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', listId)

  if (error) throw error
}

// ============ DELETE ============

export async function deleteShoppingItem(id: string): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase.from('items').delete().eq('id', id)

  if (error) throw error
}

/**
 * Supprime tous les articles achetés (état completed)
 */
export async function clearCompletedShoppingItems(): Promise<number> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()

  // D'abord compter les items à supprimer
  const { count } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', 'list_item')
    .eq('state', 'completed')

  // Supprimer les items
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('user_id', userId)
    .eq('type', 'list_item')
    .eq('state', 'completed')

  if (error) throw error
  return count || 0
}

/**
 * Met à jour uniquement la catégorie d'un article
 */
export async function updateShoppingItemCategory(
  id: string,
  category: ShoppingCategory
): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('items')
    .update({
      shopping_category: category,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) throw error
}

// ============ SERVICE OBJECT ============

export const shoppingService = {
  fetchActiveShoppingList,
  fetchShoppingListItems,
  fetchAllShoppingItems,
  addShoppingItem,
  toggleShoppingItem,
  updateShoppingItem,
  updateShoppingItemCategory,
  renameShoppingList,
  deleteShoppingItem,
  clearCompletedShoppingItems
}
