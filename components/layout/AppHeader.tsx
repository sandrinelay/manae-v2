'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CalendarIcon, CalendarOffIcon } from '@/components/ui/icons'
import { useAuth } from '@/contexts/AuthContext'

export function AppHeader() {
  const { firstName } = useAuth()
  const displayName = firstName || 'toi'
  const [isCalendarConnected, setIsCalendarConnected] = useState(false)

  useEffect(() => {
    // Vérifier l'état de connexion Google Calendar
    const checkConnection = () => {
      const tokens = localStorage.getItem('google_tokens')
      setIsCalendarConnected(!!tokens)
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

  return (
    <div>
      <header className="bg-white px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <span className="font-quicksand text-2xl font-bold text-text-dark tracking-tight">
          manae
        </span>

        {/* Right section: Calendar indicator + Greeting */}
        <div className="flex items-center gap-3">
          {/* Indicateur discret Google Calendar - cliquable vers profil */}
          <Link
            href="/profil"
            className="flex items-center p-1 -m-1 rounded-full hover:bg-gray-100 transition-colors"
            title={isCalendarConnected ? 'Google Calendar connecté' : 'Connecter Google Calendar'}
          >
            {isCalendarConnected ? (
              <CalendarIcon className="w-4 h-4 text-green-500" />
            ) : (
              <CalendarOffIcon className="w-4 h-4 text-gray-300" />
            )}
          </Link>

          {/* Greeting */}
          <span className="text-sm text-text-muted">
            Bonjour {displayName}
          </span>
        </div>
      </header>
      {/* Barre décorative gradient */}
      <div
        className="h-1 w-full"
        style={{ background: 'linear-gradient(90deg, #4A7488, #BEE5D3)' }}
      />
    </div>
  )
}
