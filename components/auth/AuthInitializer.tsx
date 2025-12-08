'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthInitializer() {
    useEffect(() => {
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                console.log('Initializing dev auth...')
                const email = 'dev@manae.app'
                const password = 'dev123456'

                // Try to sign in
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password
                })

                if (signInError) {
                    // Only try to sign up if it's an "Invalid login credentials" error
                    // Don't try to sign up on rate limit errors
                    if (signInError.message.includes('Invalid login credentials')) {
                        console.log('Account does not exist, creating dev account...')
                        const { error: signUpError } = await supabase.auth.signUp({
                            email,
                            password
                        })

                        if (signUpError) {
                            // Rate limit or other errors - just log and continue
                            console.warn('Could not create account:', signUpError.message)
                        } else {
                            console.log('Created and signed in as dev user')
                        }
                    } else {
                        // Other errors (like rate limiting) - just log
                        console.warn('Sign in error:', signInError.message)
                    }
                } else {
                    console.log('Signed in as dev user')
                }
            } else {
                console.log('Already authenticated')
            }
        }

        initAuth()
    }, [])

    return null
}
