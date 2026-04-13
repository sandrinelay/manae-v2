'use client'

import { CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

interface AppHeaderProps {
  onAgendaOpen?: () => void
}

export function AppHeader({ onAgendaOpen }: AppHeaderProps) {
  const { firstName } = useAuth()
  const displayName = firstName || 'toi'

  return (
    <div>
      <header className="bg-white px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <span className="font-quicksand text-2xl font-bold text-text-dark tracking-tight">
          manae
        </span>

        {/* Right section: Agenda button + Greeting */}
        <div className="flex items-center gap-3">
          {/* Bouton agenda */}
          {onAgendaOpen && (
            <button
              onClick={onAgendaOpen}
              aria-label="Ouvrir l'agenda"
              className="p-1.5 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
            >
              <CalendarDays className="w-5 h-5 text-text-muted" />
            </button>
          )}

          {/* Greeting + lien profil */}
          <Link href="/profil" className="text-sm text-text-muted hover:text-text-dark transition-colors">
            Bonjour {displayName}
          </Link>
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
