import { createClient } from '@/lib/supabase/client'

// Types basés sur le schéma de la base de données

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
