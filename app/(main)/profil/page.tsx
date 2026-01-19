'use client'

import { useCallback, Suspense, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useProfileData } from '@/contexts/ProfileDataContext'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { ProfileHeader } from '@/components/profil/ProfileHeader'
import { PersonalInfoSection } from '@/components/profil/PersonalInfoSection'
import { PreferencesSection } from '@/components/profil/PreferencesSection'
import { ConnectionsSection } from '@/components/profil/ConnectionsSection'
import { MoreSection } from '@/components/profil/MoreSection'
import { LogoutButton } from '@/components/profil/LogoutButton'
import { createClient } from '@/lib/supabase/client'

function ProfilPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const {
    profile,
    constraints,
    isLoading,
    error,
    refetch,
    updateName,
    updateEnergyMoments,
    updateConstraints
  } = useProfileData()

  const connectCalendar = searchParams.get('connectCalendar') === 'true'
  const connectionsSectionRef = useRef<HTMLDivElement>(null)

  // Scroll vers la section Connexions si connectCalendar=true
  useEffect(() => {
    if (connectCalendar && connectionsSectionRef.current) {
      // Petit délai pour laisser le rendu se stabiliser
      setTimeout(() => {
        connectionsSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }, 100)
    }
  }, [connectCalendar])

  // Callback après connexion Google Calendar réussie
  const handleCalendarConnectSuccess = useCallback(() => {
    const pendingPlanning = localStorage.getItem('manae_pending_planning')

    if (pendingPlanning && connectCalendar) {
      try {
        const context = JSON.parse(pendingPlanning)

        if (context.returnTo === 'clarte-schedule' || context.returnTo === 'clarte-shopping') {
          router.push('/clarte?resumePlanning=true')
        } else {
          router.push('/capture?resumePlanning=true')
        }
      } catch {
        console.error('Erreur parsing pending planning context')
      }
    }
  }, [connectCalendar, router])

  const handleLogout = async () => {
    localStorage.removeItem('google_tokens')
    localStorage.removeItem('manae_onboarding')

    const keysToRemove = Object.keys(localStorage).filter(
      key => key.startsWith('sb-') || key.includes('supabase')
    )
    keysToRemove.forEach(key => localStorage.removeItem(key))

    const supabase = createClient()
    await supabase.auth.signOut({ scope: 'global' })

    window.location.href = '/login'
  }

  const handlePullRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  // État de chargement initial uniquement (pas de loader si données déjà présentes)
  if (isLoading && !profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-text-muted">Veuillez vous connecter pour accéder à votre profil.</p>
          <a href="/login" className="text-primary font-medium hover:underline">
            Se connecter
          </a>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-red-500">Erreur lors du chargement du profil</p>
          <button
            onClick={refetch}
            className="text-primary font-medium hover:underline"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <PullToRefresh onRefresh={handlePullRefresh} className="flex-1 pb-24">
      <div className="max-w-2xl mx-auto px-4">
        <ProfileHeader
          firstName={profile?.firstName}
          lastName={profile?.lastName}
          email={profile?.email}
        />

        <div className="space-y-4">
          <PersonalInfoSection
            firstName={profile?.firstName}
            lastName={profile?.lastName}
            email={profile?.email}
            onSave={updateName}
          />

          <PreferencesSection
            energyMoments={profile?.energyMoments || []}
            constraints={constraints}
            onSaveEnergyMoments={updateEnergyMoments}
            onSaveConstraints={updateConstraints}
          />

          <div ref={connectionsSectionRef}>
            <ConnectionsSection onConnectSuccess={handleCalendarConnectSuccess} />
          </div>

          <MoreSection />

          <LogoutButton onLogout={handleLogout} />
        </div>
      </div>
    </PullToRefresh>
  )
}

export default function ProfilPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <ProfilPageContent />
    </Suspense>
  )
}
