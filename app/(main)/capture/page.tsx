'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAIQuota } from '@/contexts/AIQuotaContext'
import { CaptureFlow } from '@/features/capture/components'

export default function CapturePage() {
  const { user, isLoading } = useAuth()
  const { refresh: refreshQuota } = useAIQuota()

  // Rafraîchir le quota à chaque montage de la page
  // (important après onboarding ou retour sur la page)
  useEffect(() => {
    if (user && !isLoading) {
      refreshQuota()
    }
  }, [user, isLoading, refreshQuota])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-text-muted">Veuillez vous connecter pour capturer vos pensées.</p>
          <a href="/login" className="text-primary font-medium hover:underline">
            Se connecter
          </a>
        </div>
      </div>
    )
  }

  // Authenticated - show CaptureFlow
  return (
    <CaptureFlow
      userId={user.id}
      onSuccess={() => {
        console.log('Capture saved successfully!')
      }}
    />
  )
}
