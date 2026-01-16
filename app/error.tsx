'use client'

import { useEffect } from 'react'
import { AlertIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/Button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log l'erreur pour le debugging
    console.error('Erreur capturée:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-mint flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertIcon className="w-10 h-10 text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-text-dark mb-3">
          Oups, une erreur !
        </h1>

        <p className="text-text-muted mb-8">
          Quelque chose s&apos;est mal passé. Réessaie ou reviens plus tard.
        </p>

        <Button onClick={reset}>
          Réessayer
        </Button>
      </div>
    </div>
  )
}
