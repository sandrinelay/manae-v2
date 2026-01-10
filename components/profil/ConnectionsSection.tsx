'use client'

import { useState, useEffect } from 'react'
import { CalendarIcon, LinkIcon, UnlinkIcon, CheckCircleIcon } from '@/components/ui/icons'
import { openGoogleAuthPopup, exchangeCodeForToken } from '@/lib/googleCalendar'

interface ConnectionsSectionProps {
  onConnectSuccess?: () => void
}

export function ConnectionsSection({ onConnectSuccess }: ConnectionsSectionProps) {
  const [isGoogleConnected, setIsGoogleConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Vérifier si Google Calendar est connecté
    const checkConnection = () => {
      const tokens = localStorage.getItem('google_tokens')
      setIsGoogleConnected(!!tokens)
    }

    checkConnection()

    // Écouter les changements de connexion
    const handleConnectionChange = () => {
      checkConnection()
    }

    window.addEventListener('calendar-connection-changed', handleConnectionChange)
    window.addEventListener('storage', handleConnectionChange)

    return () => {
      window.removeEventListener('calendar-connection-changed', handleConnectionChange)
      window.removeEventListener('storage', handleConnectionChange)
    }
  }, [])

  const handleConnect = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const code = await openGoogleAuthPopup()
      const tokens = await exchangeCodeForToken(code)

      // Calculer expires_at à partir de expires_in (en secondes)
      const tokensWithExpiry = {
        ...tokens,
        expires_at: Date.now() + (tokens.expires_in * 1000)
      }

      // Sauvegarder les tokens
      localStorage.setItem('google_tokens', JSON.stringify(tokensWithExpiry))

      // Dispatch event pour notifier les autres composants
      window.dispatchEvent(new CustomEvent('calendar-connection-changed'))

      setIsGoogleConnected(true)

      // Callback après connexion réussie
      onConnectSuccess?.()
    } catch (err) {
      console.error('Erreur connexion Google:', err)
      setError('Erreur lors de la connexion à Google Calendar')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = () => {
    // Suppression locale uniquement (recommandation beta)
    localStorage.removeItem('google_tokens')

    // Dispatch event pour notifier les autres composants
    window.dispatchEvent(new CustomEvent('calendar-connection-changed'))

    setIsGoogleConnected(false)
  }

  return (
    <section className="bg-white rounded-2xl overflow-hidden">
      <h2 className="px-4 pt-4 pb-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
        Connexions
      </h2>

      {/* Google Calendar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-blue-500" />
          <div>
            <p className="text-text-dark font-medium">Google Calendar</p>
            <p className="text-sm text-text-muted">
              {isGoogleConnected ? 'Connecté' : 'Non connecté'}
            </p>
          </div>
        </div>

        {isGoogleConnected ? (
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-text-muted hover:bg-gray-200 transition-colors"
          >
            <UnlinkIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Déconnecter</span>
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <LinkIcon className="w-4 h-4" />
            <span className="text-sm font-medium">
              {isLoading ? 'Connexion...' : 'Connecter'}
            </span>
          </button>
        )}
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="px-4 pb-3">
          <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </div>
        </div>
      )}

      {/* Indicateur de statut si connecté */}
      {isGoogleConnected && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
            <CheckCircleIcon className="w-4 h-4" />
            <span>Tes tâches peuvent être calées sur ton agenda</span>
          </div>
        </div>
      )}
    </section>
  )
}
