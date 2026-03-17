import type { SupabaseClient } from '@supabase/supabase-js'
import type { List, ListSlug } from '@/types/lists'
import type { Item } from '@/types/items'

export async function getLists(supabase: SupabaseClient, userId: string): Promise<List[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', userId)
    .eq('enabled', true)
    .order('position', { ascending: true })

  if (error) {
    console.warn('[lists] getLists failed:', error.message)
    return []
  }
  return data || []
}

export async function getAllLists(supabase: SupabaseClient, userId: string): Promise<List[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })

  if (error) {
    console.warn('[lists] getAllLists failed:', error.message)
    return []
  }
  return data || []
}

export async function getItemsByList(
  supabase: SupabaseClient,
  userId: string,
  listId: string
): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'list_item')
    .eq('list_id', listId)
    .in('state', ['active', 'completed'])
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('[lists] getItemsByList failed:', error.message)
    return []
  }
  return data || []
}

export async function getListsWithCounts(
  supabase: SupabaseClient,
  userId: string
): Promise<Array<List & { activeCount: number }>> {
  const lists = await getLists(supabase, userId)
  if (lists.length === 0) return []

  const { data: items } = await supabase
    .from('items')
    .select('list_id')
    .eq('user_id', userId)
    .eq('type', 'list_item')
    .eq('state', 'active')

  const countByList: Record<string, number> = {}
  for (const item of items || []) {
    if (item.list_id) {
      countByList[item.list_id] = (countByList[item.list_id] || 0) + 1
    }
  }

  return lists.map(list => ({
    ...list,
    activeCount: countByList[list.id] || 0,
  }))
}

export async function getListBySlug(
  supabase: SupabaseClient,
  userId: string,
  slug: ListSlug
): Promise<List | null> {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', userId)
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.warn('[lists] getListBySlug failed:', error.message)
    return null
  }
  return data
}

export async function updateListEnabled(
  supabase: SupabaseClient,
  listId: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from('lists')
    .update({ enabled })
    .eq('id', listId)

  if (error) {
    throw new Error(`[lists] updateListEnabled failed: ${error.message}`)
  }
}

export async function moveItemToList(
  supabase: SupabaseClient,
  itemId: string,
  listId: string
): Promise<void> {
  const { error } = await supabase
    .from('items')
    .update({ list_id: listId, updated_at: new Date().toISOString() })
    .eq('id', itemId)

  if (error) {
    throw new Error(`[lists] moveItemToList failed: ${error.message}`)
  }
}
