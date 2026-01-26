'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  firstName: string | null
  isLoading: boolean
  isAnonymous: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firstName, setFirstName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAnonymous, setIsAnonymous] = useState(false)

  const supabase = createClient()

  // Charger le prénom depuis le cache au montage (côté client uniquement)
  useEffect(() => {
    const cached = localStorage.getItem('manae_firstName')
    if (cached) {
      setFirstName(cached)
    }
  }, [])

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('first_name')
        .eq('id', userId)
        .single()

      if (profile?.first_name) {
        setFirstName(profile.first_name)
        // Sauvegarder en cache pour éviter le flash au prochain chargement
        localStorage.setItem('manae_firstName', profile.first_name)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }, [supabase])

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchUserProfile(user.id)
    }
  }, [user, fetchUserProfile])

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()

        if (currentUser) {
          setUser(currentUser)
          setIsAnonymous(currentUser.is_anonymous ?? false)
          setIsLoading(false)
          // Récupérer le prénom en arrière-plan (non bloquant)
          fetchUserProfile(currentUser.id)
        } else {
          // Pas d'utilisateur connecté - laisser user à null
          // L'utilisateur sera redirigé vers /login si nécessaire
          setUser(null)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
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
          setIsLoading(false)
          fetchUserProfile(session.user.id)
        } else {
          setUser(null)
          setFirstName(null)
          setIsAnonymous(false)
          setIsLoading(false)
          // Nettoyer le cache
          localStorage.removeItem('manae_firstName')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchUserProfile])

  return (
    <AuthContext.Provider value={{ user, firstName, isLoading, isAnonymous, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
