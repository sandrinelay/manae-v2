'use client'

import { useAuth } from '@/hooks/useAuth'
import { CaptureFlow } from '@/features/capture/components'
import { AppHeader } from '@/components/layout'
import BottomNav from '@/components/layout/BottomNav'

export default function CapturePage() {
  const { user, firstName, isLoading } = useAuth()

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-mint flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-mint flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-text-muted">Veuillez vous connecter pour capturer vos pensées.</p>
          <a href="/login" className="text-primary font-medium hover:underline">
            Se connecter
          </a>
        </div>
      </div>
    )
  }

  // Authenticated - show Header + CaptureFlow + BottomNav
  return (
    <div className="min-h-screen bg-mint flex flex-col">
      <AppHeader userName={firstName || undefined} />
      <CaptureFlow
        userId={user.id}
        onSuccess={() => {
          console.log('Capture saved successfully!')
        }}
      />
      <BottomNav />
    </div>
  )
}
