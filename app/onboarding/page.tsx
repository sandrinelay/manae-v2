'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getOrCreateUserProfile } from '@/services/supabaseService'

export default function OnboardingRedirect() {
  const router = useRouter()

  useEffect(() => {
    const initOnboarding = async () => {
      try {
        const profile = await getOrCreateUserProfile()

        // Sauvegarder le prénom en cache pour éviter le flash "Bonjour toi"
        if (profile.first_name) {
          localStorage.setItem('manae_firstName', profile.first_name)
        }

        // Sauvegarder les infos du profil pour le flow onboarding
        const payload = {
          step: 1,
          currentStep: 2,
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          email: profile.email || '',
          completed_at: new Date().toISOString()
        }
        localStorage.setItem('manae_onboarding', JSON.stringify(payload))
      } catch (error) {
        console.error('Error loading profile:', error)
      }

      // Rediriger vers step 2 (les infos prénom/nom sont déjà en base via le signup)
      router.replace('/onboarding/step1')
    }

    initOnboarding()
  }, [router])

  return (
    <div className="min-h-screen bg-mint flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  )
}
