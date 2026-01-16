'use client'

import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-mint flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-10 h-10 text-gray-400" />
        </div>

        <h1 className="text-2xl font-bold text-text-dark mb-3">
          Pas de connexion
        </h1>

        <p className="text-text-muted mb-8">
          Vérifie ta connexion internet et réessaie.
        </p>

        <Button onClick={handleRetry}>
          Réessayer
        </Button>
      </div>
    </div>
  )
}
