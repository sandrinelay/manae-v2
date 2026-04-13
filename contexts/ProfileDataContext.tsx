'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { getOrCreateUserProfile, updateUserProfile, getConstraints, saveConstraints } from '@/services/supabaseService'
import { scheduleExceptionsService } from '@/services/schedule-exceptions.service'
import { createClient } from '@/lib/supabase/client'
import type { Constraint, ScheduleException } from '@/types'

// ============================================
// TYPES
// ============================================

interface ProfileData {
  firstName: string
  lastName: string
  email: string
  energyMoments: string[]
}

interface ProfileDataContextType {
  profile: ProfileData | null
  constraints: Constraint[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  updateName: (firstName: string, lastName: string) => Promise<void>
  updateEnergyMoments: (moments: string[]) => Promise<void>
  updateConstraints: (constraints: Constraint[]) => Promise<void>
  exceptions: ScheduleException[]
  addException: (data: Omit<ScheduleException, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  deleteException: (id: string) => Promise<void>
}

// ============================================
// CONTEXT
// ============================================

const ProfileDataContext = createContext<ProfileDataContextType | undefined>(undefined)

// ============================================
// PROVIDER
// ============================================

export function ProfileDataProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [constraints, setConstraints] = useState<Constraint[]>([])
  const [exceptions, setExceptions] = useState<ScheduleException[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [hasFetched, setHasFetched] = useState(false)

  const fetchData = useCallback(async (force = false) => {
    if (!user) {
      setIsLoading(false)
      return
    }

    // Ne pas recharger si déjà fetchées (sauf si force=true)
    if (!force && hasFetched && profile) {
      setIsLoading(false)
      return
    }

    try {
      if (!profile) {
        setIsLoading(true)
      }
      setError(null)

      const supabase = createClient()
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      const [userProfile, userConstraints, userExceptions] = await Promise.all([
        getOrCreateUserProfile(),
        getConstraints(),
        currentUser
          ? scheduleExceptionsService.getExceptions(supabase, currentUser.id).catch(err => {
              console.warn('[profil] Exceptions non chargées:', err)
              return [] as ScheduleException[]
            })
          : Promise.resolve([] as ScheduleException[])
      ])
      setExceptions(userExceptions)

      setProfile({
        firstName: userProfile.first_name || '',
        lastName: userProfile.last_name || '',
        email: userProfile.email || user.email || '',
        energyMoments: userProfile.energy_moments || []
      })

      const mappedConstraints: Constraint[] = userConstraints.map(c => ({
        id: c.id,
        name: c.name,
        category: c.category as Constraint['category'],
        context: (c.context || 'any') as Constraint['context'],
        days: c.days,
        start_time: c.start_time,
        end_time: c.end_time,
        allow_lunch_break: c.allow_lunch_break ?? false
      }))
      setConstraints(mappedConstraints)
      setHasFetched(true)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erreur chargement profil'))
    } finally {
      setIsLoading(false)
    }
  }, [user, hasFetched, profile])

  useEffect(() => {
    if (user && !authLoading) {
      fetchData()
    }
  }, [user, authLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = useCallback(async () => {
    await fetchData(true)
  }, [fetchData])

  const updateName = useCallback(async (firstName: string, lastName: string) => {
    await updateUserProfile({
      first_name: firstName,
      last_name: lastName
    })
    // Mettre à jour le cache pour éviter le flash "Bonjour toi"
    localStorage.setItem('manae_firstName', firstName)
    setProfile(prev => prev ? { ...prev, firstName, lastName } : null)
  }, [])

  const updateEnergyMoments = useCallback(async (moments: string[]) => {
    await updateUserProfile({
      energy_moments: moments
    })
    setProfile(prev => prev ? { ...prev, energyMoments: moments } : null)
  }, [])

  const addException = useCallback(async (data: Omit<ScheduleException, 'id' | 'user_id' | 'created_at'>) => {
    const supabase = createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) throw new Error('Non authentifié')
    const newException = await scheduleExceptionsService.createException(supabase, currentUser.id, data)
    setExceptions(prev => [...prev, newException].sort((a, b) => a.start_date.localeCompare(b.start_date)))
  }, [])

  const deleteException = useCallback(async (id: string) => {
    const supabase = createClient()
    await scheduleExceptionsService.deleteException(supabase, id)
    setExceptions(prev => prev.filter(e => e.id !== id))
  }, [])

  const updateConstraints = useCallback(async (newConstraints: Constraint[]) => {
    const constraintsForDb = newConstraints.map(c => ({
      name: c.name,
      category: c.category,
      context: c.context || 'any',
      days: c.days,
      start_time: c.start_time,
      end_time: c.end_time,
      allow_lunch_break: c.allow_lunch_break
    }))
    await saveConstraints(constraintsForDb)
    setConstraints(newConstraints)
  }, [])

  return (
    <ProfileDataContext.Provider
      value={{
        profile,
        constraints,
        isLoading: isLoading || authLoading,
        error,
        refetch,
        updateName,
        updateEnergyMoments,
        updateConstraints,
        exceptions,
        addException,
        deleteException
      }}
    >
      {children}
    </ProfileDataContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================

export function useProfileData() {
  const context = useContext(ProfileDataContext)
  if (context === undefined) {
    throw new Error('useProfileData must be used within a ProfileDataProvider')
  }
  return context
}
