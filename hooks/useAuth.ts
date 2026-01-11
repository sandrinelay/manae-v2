'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
    const [user, setUser] = useState<User | null>(null)
    const [firstName, setFirstName] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isAnonymous, setIsAnonymous] = useState(false)

    useEffect(() => {
        const supabase = createClient()

        const fetchUserProfile = async (userId: string) => {
            try {
                const { data: profile } = await supabase
                    .from('users')
                    .select('first_name')
                    .eq('id', userId)
                    .single()

                if (profile?.first_name) {
                    setFirstName(profile.first_name)
                }
            } catch (error) {
                console.error('Error fetching user profile:', error)
            }
        }

        const initAuth = async () => {
            try {
                // Check if user is already authenticated
                const { data: { user: currentUser } } = await supabase.auth.getUser()

                if (currentUser) {
                    setUser(currentUser)
                    setIsAnonymous(currentUser.is_anonymous ?? false)
                    // Récupérer le prénom
                    await fetchUserProfile(currentUser.id)
                } else {
                    // Sign in anonymously if no user
                    const { data, error } = await supabase.auth.signInAnonymously()
                    if (error) {
                        console.error('Error signing in anonymously:', error)
                    } else if (data.user) {
                        setUser(data.user)
                        setIsAnonymous(true)
                    }
                }
            } catch (error) {
                console.error('Auth initialization error:', error)
            } finally {
                setIsLoading(false)
            }
        }

        initAuth()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (session?.user) {
                    setUser(session.user)
                    setIsAnonymous(session.user.is_anonymous ?? false)
                    setIsLoading(false) // Immédiatement après avoir le user
                    // Récupérer le prénom en arrière-plan (non bloquant)
                    fetchUserProfile(session.user.id)
                } else {
                    setUser(null)
                    setFirstName(null)
                    setIsAnonymous(false)
                    setIsLoading(false)
                }
            }
        )

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    return { user, firstName, isLoading, isAnonymous }
}
