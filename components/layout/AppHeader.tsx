'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface AppHeaderProps {
  userName?: string
}

export function AppHeader({ userName }: AppHeaderProps) {
  const [isCalendarConnected, setIsCalendarConnected] = useState(false)

  useEffect(() => {
    const tokens = localStorage.getItem('google_tokens')
    setIsCalendarConnected(!!tokens)

    const handleConnectionChange = (event: CustomEvent) => {
      setIsCalendarConnected(event.detail.connected)
    }

    window.addEventListener('calendar-connection-changed', handleConnectionChange as EventListener)

    return () => {
      window.removeEventListener('calendar-connection-changed', handleConnectionChange as EventListener)
    }
  }, [])

  return (
    <header className="bg-white border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      {/* Logo */}
      <Link href="/capture" className="font-quicksand text-2xl font-bold text-text-dark tracking-tight">
        manae
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Google Calendar status */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isCalendarConnected ? 'bg-green-500' : 'bg-orange-400'}`} />
          <span className="text-xs text-text-muted hidden sm:block">
            Calendar
          </span>
        </div>

        {/* User name */}
        {userName && (
          <span className="text-sm text-text-muted hidden sm:block">
            {userName}
          </span>
        )}

        {/* Profile button */}
        <button
          className="w-10 h-10 rounded-full bg-mint flex items-center justify-center hover:bg-primary/10 transition-colors"
          aria-label="Profil"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-text-dark"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>
      </div>
    </header>
  )
}
