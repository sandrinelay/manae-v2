'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { AppHeader } from '@/components/layout'
import BottomNav from '@/components/layout/BottomNav'
import { ProfileHeader } from '@/components/profil/ProfileHeader'
import { PersonalInfoSection } from '@/components/profil/PersonalInfoSection'
import { PreferencesSection } from '@/components/profil/PreferencesSection'
import { ConnectionsSection } from '@/components/profil/ConnectionsSection'
import { MoreSection } from '@/components/profil/MoreSection'
import { LogoutButton } from '@/components/profil/LogoutButton'
import { getOrCreateUserProfile, updateUserProfile, getConstraints, saveConstraints } from '@/services/supabaseService'
import { createClient } from '@/lib/supabase/client'
import type { Constraint } from '@/types'

interface UserProfileData {
  firstName: string
  lastName: string
  email: string
  energyMoments: string[]
}

export default function ProfilPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [constraints, setConstraints] = useState<Constraint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Charger les données du profil
  const loadProfile = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      const [userProfile, userConstraints] = await Promise.all([
        getOrCreateUserProfile(),
        getConstraints()
      ])

      setProfile({
        firstName: userProfile.first_name || '',
        lastName: userProfile.last_name || '',
        email: userProfile.email || user.email || '',
        energyMoments: userProfile.energy_moments || []
      })

      // Mapper les contraintes
      const mappedConstraints: Constraint[] = userConstraints.map(c => ({
        id: c.id,
        name: c.name,
        category: c.category as Constraint['category'],
        days: c.days,
        start_time: c.start_time,
        end_time: c.end_time,
        allow_lunch_break: c.allow_lunch_break ?? false
      }))
      setConstraints(mappedConstraints)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur chargement profil')
      setError(error)
      console.error('Erreur chargement profil:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user && !authLoading) {
      loadProfile()
    }
  }, [user, authLoading, loadProfile])

  // Handlers
  const handleSaveName = async (firstName: string, lastName: string) => {
    await updateUserProfile({
      first_name: firstName,
      last_name: lastName
    })

    setProfile(prev => prev ? {
      ...prev,
      firstName,
      lastName
    } : null)
  }

  const handleSaveEnergyMoments = async (moments: string[]) => {
    await updateUserProfile({
      energy_moments: moments
    })

    setProfile(prev => prev ? {
      ...prev,
      energyMoments: moments
    } : null)
  }

  const handleSaveConstraints = async (newConstraints: Constraint[]) => {
    const constraintsForDb = newConstraints.map(c => ({
      name: c.name,
      category: c.category,
      days: c.days,
      start_time: c.start_time,
      end_time: c.end_time,
      allow_lunch_break: c.allow_lunch_break
    }))

    await saveConstraints(constraintsForDb)
    setConstraints(newConstraints)
  }

  const handleGoogleConnect = () => {
    // Rediriger vers le flow OAuth Google Calendar
    // On sauvegarde la page de retour
    localStorage.setItem('manae_redirect_after_oauth', '/profil')
    router.push('/onboarding/step4')
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()

    // Nettoyer le localStorage
    localStorage.removeItem('google_tokens')
    localStorage.removeItem('manae_onboarding')

    router.push('/login')
  }

  // États de chargement
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-mint flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-mint flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-text-muted">Veuillez vous connecter pour accéder à votre profil.</p>
          <a href="/login" className="text-primary font-medium hover:underline">
            Se connecter
          </a>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-mint flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-red-500">Erreur lors du chargement du profil</p>
          <button
            onClick={loadProfile}
            className="text-primary font-medium hover:underline"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mint flex flex-col">
      <AppHeader userName={profile?.firstName || user.email?.split('@')[0]} />

      <div className="flex-1 pb-24">
        <div className="max-w-2xl mx-auto px-4">
          {/* Header du profil */}
          <ProfileHeader
            firstName={profile?.firstName}
            lastName={profile?.lastName}
            email={profile?.email}
          />

          {/* Sections */}
          <div className="space-y-4">
            {/* Informations personnelles */}
            <PersonalInfoSection
              firstName={profile?.firstName}
              lastName={profile?.lastName}
              email={profile?.email}
              onSave={handleSaveName}
            />

            {/* Préférences */}
            <PreferencesSection
              energyMoments={profile?.energyMoments || []}
              constraints={constraints}
              onSaveEnergyMoments={handleSaveEnergyMoments}
              onSaveConstraints={handleSaveConstraints}
            />

            {/* Connexions */}
            <ConnectionsSection
              onGoogleConnect={handleGoogleConnect}
            />

            {/* Plus */}
            <MoreSection />

            {/* Déconnexion */}
            <LogoutButton onLogout={handleLogout} />
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
