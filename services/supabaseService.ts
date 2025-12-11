import { createClient } from '@/lib/supabase/client'
import { Item, ItemStatus, ItemType, Thought } from '@/types'

// Types basés sur le schéma de la base de données

export type { Thought } from '@/types'



export interface UserProfile {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    onboarding_completed: boolean
    energy_moments: string[] | null
    created_at: string
    updated_at: string
}

export interface Constraint {
    id: string
    user_id: string
    name: string
    category: string
    days: string[]
    start_time: string
    end_time: string
    allow_lunch_break: boolean | null
    created_at: string
}

// Helper pour obtenir le client Supabase
function getSupabase() {
    return createClient()
}

// ============ THOUGHTS (Captures) ============

export async function createThought(thought: { raw_text: string; mood?: string | null }) {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
        .from('thoughts')
        .insert({
            raw_text: thought.raw_text,
            mood: thought.mood,
            user_id: user.id
        })
        .select()
        .single()

    if (error) throw error
    return data as Thought
}

export async function getThoughts() {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
        .from('thoughts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) throw error
    return data as Thought[]
}

export async function getThoughtsCount() {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return 0

    const { count, error } = await supabase
        .from('thoughts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('processed', false)

    if (error) {
        console.error('Error getting thoughts count:', error)
        return 0
    }
    return count || 0
}

export async function getUnprocessedThoughts() {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
        .from('thoughts')
        .select('*')
        .eq('user_id', user.id)
        .eq('processed', false)
        .order('created_at', { ascending: true })

    if (error) throw error
    return data as Thought[]
}

export async function markThoughtsAsProcessed(thoughtIds: string[]) {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('User not authenticated')
    }

    const { error } = await supabase
        .from('thoughts')
        .update({
            processed: true,
            processed_at: new Date().toISOString()
        })
        .in('id', thoughtIds)
        .eq('user_id', user.id)

    if (error) throw error
}



// ============ USER PROFILE ============

export async function getOrCreateUserProfile() {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('User not authenticated')
    }

    // Essayer de récupérer le profil existant
    const { data: existingProfile, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

    if (existingProfile) {
        return existingProfile as UserProfile
    }

    // Si pas de profil, en créer un
    if (fetchError?.code === 'PGRST116') { // Not found
        const { data: newProfile, error: insertError } = await supabase
            .from('users')
            .insert({
                id: user.id,
                email: user.email || '',
                onboarding_completed: false
            })
            .select()
            .single()

        if (insertError) throw insertError
        return newProfile as UserProfile
    }

    throw fetchError
}

export async function updateUserProfile(profile: Partial<UserProfile>) {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
        .from('users')
        .update({
            ...profile,
            updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

    if (error) throw error
    return data as UserProfile
}

// ============ CONSTRAINTS ============

export async function saveConstraints(constraints: Array<Omit<Constraint, 'id' | 'user_id' | 'created_at'>>) {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('User not authenticated')
    }

    // Supprimer les anciennes contraintes
    await supabase
        .from('constraints')
        .delete()
        .eq('user_id', user.id)

    // Insérer les nouvelles
    if (constraints.length > 0) {
        const constraintsWithUser = constraints.map(c => ({
            ...c,
            user_id: user.id
        }))

        const { error } = await supabase
            .from('constraints')
            .insert(constraintsWithUser)

        if (error) throw error
    }
}

export async function getConstraints() {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
        .from('constraints')
        .select('*')
        .eq('user_id', user.id)

    if (error) throw error
    return data as Constraint[]
}

// ============ ITEMS ============

export async function createItem(item: Omit<Item, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
        .from('items')
        .insert({
            ...item,
            user_id: user.id
        })
        .select()
        .single()

    if (error) throw error
    return data as Item
}

export async function getItems(filters?: {
    status?: ItemStatus | ItemStatus[]
    type?: ItemType
    parent_project_id?: string | null
}) {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('User not authenticated')
    }

    let query = supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (filters?.status) {
        if (Array.isArray(filters.status)) {
            query = query.in('status', filters.status)
        } else {
            query = query.eq('status', filters.status)
        }
    }

    if (filters?.type) {
        query = query.eq('type', filters.type)
    }

    if (filters?.parent_project_id !== undefined) {
        if (filters.parent_project_id === null) {
            query = query.is('parent_project_id', null)
        } else {
            query = query.eq('parent_project_id', filters.parent_project_id)
        }
    }

    const { data, error } = await query

    if (error) throw error
    return data as Item[]
}

export async function updateItem(id: string, updates: Partial<Item>) {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
        .from('items')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

    if (error) throw error
    return data as Item
}

export async function deleteItem(id: string) {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('User not authenticated')
    }

    const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) throw error
}