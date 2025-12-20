import { createClient } from '@/lib/supabase/client'
import type {
  Item,
  ItemType,
  ItemState,
  CreateItemInput,
  UpdateItemInput,
  ItemFilters
} from '@/types/items'
import { isValidListItem, isValidItemTypeState } from '@/types/items'

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

export async function createItem(input: CreateItemInput): Promise<Item> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()

  // Validation
  const state = input.state || 'captured'
  if (!isValidItemTypeState(input.type, state)) {
    throw new Error(`Invalid type/state combination: ${input.type}/${state}`)
  }

  if (!isValidListItem(input.type, input.list_id)) {
    throw new Error('list_item type requires a list_id')
  }

  const { data, error } = await supabase
    .from('items')
    .insert({
      user_id: userId,
      type: input.type,
      state: state,
      content: input.content,
      context: input.context || null,
      ai_analysis: input.ai_analysis || null,
      metadata: input.metadata || {},
      parent_id: input.parent_id || null,
      list_id: input.list_id || null,
      scheduled_at: input.scheduled_at || null,
      mood: input.mood || null
    })
    .select()
    .single()

  if (error) throw error
  return data as Item
}

export async function createItems(inputs: CreateItemInput[]): Promise<Item[]> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()

  // Validation de tous les items
  for (const input of inputs) {
    const state = input.state || 'captured'
    if (!isValidItemTypeState(input.type, state)) {
      throw new Error(`Invalid type/state combination: ${input.type}/${state}`)
    }
    if (!isValidListItem(input.type, input.list_id)) {
      throw new Error('list_item type requires a list_id')
    }
  }

  const itemsToInsert = inputs.map(input => ({
    user_id: userId,
    type: input.type,
    state: input.state || 'captured',
    content: input.content,
    context: input.context || null,
    ai_analysis: input.ai_analysis || null,
    metadata: input.metadata || {},
    parent_id: input.parent_id || null,
    list_id: input.list_id || null,
    scheduled_at: input.scheduled_at || null,
    mood: input.mood || null
  }))

  const { data, error } = await supabase
    .from('items')
    .insert(itemsToInsert)
    .select()

  if (error) throw error
  return data as Item[]
}

// ============================================
// READ
// ============================================

export async function getItem(id: string): Promise<Item | null> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }

  return data as Item
}

export async function getItems(filters?: ItemFilters): Promise<Item[]> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()

  let query = supabase
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (filters?.type) {
    if (Array.isArray(filters.type)) {
      query = query.in('type', filters.type)
    } else {
      query = query.eq('type', filters.type)
    }
  }

  if (filters?.state) {
    if (Array.isArray(filters.state)) {
      query = query.in('state', filters.state)
    } else {
      query = query.eq('state', filters.state)
    }
  }

  if (filters?.context) {
    query = query.eq('context', filters.context)
  }

  if (filters?.parent_id !== undefined) {
    if (filters.parent_id === null) {
      query = query.is('parent_id', null)
    } else {
      query = query.eq('parent_id', filters.parent_id)
    }
  }

  if (filters?.list_id !== undefined) {
    if (filters.list_id === null) {
      query = query.is('list_id', null)
    } else {
      query = query.eq('list_id', filters.list_id)
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
  return data as Item[]
}

export async function getItemsByState(state: ItemState | ItemState[]): Promise<Item[]> {
  return getItems({ state })
}

export async function getItemsByType(type: ItemType | ItemType[]): Promise<Item[]> {
  return getItems({ type })
}

export async function getCapturedItems(): Promise<Item[]> {
  return getItems({ state: 'captured' })
}

export async function getActiveItems(): Promise<Item[]> {
  return getItems({ state: 'active' })
}

export async function getPlannedItems(): Promise<Item[]> {
  return getItems({ state: 'planned', type: 'task' })
}

export async function getChildItems(parentId: string): Promise<Item[]> {
  return getItems({ parent_id: parentId })
}

export async function getListItems(listId: string): Promise<Item[]> {
  return getItems({ list_id: listId, type: 'list_item' })
}

export async function getItemsCount(filters?: ItemFilters): Promise<number> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()

  let query = supabase
    .from('items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (filters?.type) {
    if (Array.isArray(filters.type)) {
      query = query.in('type', filters.type)
    } else {
      query = query.eq('type', filters.type)
    }
  }

  if (filters?.state) {
    if (Array.isArray(filters.state)) {
      query = query.in('state', filters.state)
    } else {
      query = query.eq('state', filters.state)
    }
  }

  const { count, error } = await query

  if (error) throw error
  return count || 0
}

// ============================================
// UPDATE
// ============================================

export async function updateItem(id: string, updates: UpdateItemInput): Promise<Item> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()

  // Si on change type ou state, valider la cohérence
  if (updates.type || updates.state) {
    const current = await getItem(id)
    if (!current) throw new Error('Item not found')

    const newType = updates.type || current.type
    const newState = updates.state || current.state

    if (!isValidItemTypeState(newType, newState)) {
      throw new Error(`Invalid type/state combination: ${newType}/${newState}`)
    }
  }

  const { data, error } = await supabase
    .from('items')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data as Item
}

export async function updateItemState(id: string, state: ItemState): Promise<Item> {
  return updateItem(id, { state })
}

export async function markItemActive(id: string): Promise<Item> {
  return updateItemState(id, 'active')
}

export async function markItemCompleted(id: string): Promise<Item> {
  return updateItemState(id, 'completed')
}

export async function markItemArchived(id: string): Promise<Item> {
  return updateItemState(id, 'archived')
}

export async function scheduleItem(
  id: string,
  scheduledAt: string,
  googleEventId?: string
): Promise<Item> {
  return updateItem(id, {
    state: 'planned',
    scheduled_at: scheduledAt,
    google_event_id: googleEventId
  })
}

// ============================================
// DELETE
// ============================================

export async function deleteItem(id: string): Promise<void> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()

  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw error
}

export async function deleteItems(ids: string[]): Promise<void> {
  const userId = await getCurrentUserId()
  const supabase = getSupabase()

  const { error } = await supabase
    .from('items')
    .delete()
    .in('id', ids)
    .eq('user_id', userId)

  if (error) throw error
}
