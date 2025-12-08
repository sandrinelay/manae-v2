'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isAnonymous, setIsAnonymous] = useState(false)

    useEffect(() => {
        const supabase = createClient()

        const initAuth = async () => {
            try {
                // Check if user is already authenticated
                const { data: { user: currentUser } } = await supabase.auth.getUser()

                if (currentUser) {
                    setUser(currentUser)
                    setIsAnonymous(currentUser.is_anonymous ?? false)
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
            async (event, session) => {
                if (session?.user) {
                    setUser(session.user)
                    setIsAnonymous(session.user.is_anonymous ?? false)
                } else {
                    setUser(null)
                    setIsAnonymous(false)
                }
            }
        )

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    return { user, isLoading, isAnonymous }
}
