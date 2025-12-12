'use client'

import { useState, useEffect } from 'react'
import CalendarBadge from '@/lib/layout/CalendarBadge'

export default function Header() {
    const [isCalendarConnected, setIsCalendarConnected] = useState(false)

    // Vérifier au mount si Google Calendar est connecté
    useEffect(() => {
        const tokens = localStorage.getItem('google_tokens')
        setIsCalendarConnected(!!tokens)

        // Écouter les changements de connexion (via custom event)
        const handleConnectionChange = (event: CustomEvent) => {
            setIsCalendarConnected(event.detail.connected)
        }

        window.addEventListener('calendar-connection-changed', handleConnectionChange as EventListener)

        return () => {
            window.removeEventListener('calendar-connection-changed', handleConnectionChange as EventListener)
        }
    }, [])

    return (
        <header className="bg-white border-b border-border px-4 py-3 flex items-center justify-between">
            <h1 className="font-quicksand text-2xl font-bold text-secondary">
                Manae
            </h1>

            <div className="flex items-center gap-3">
                <CalendarBadge connected={isCalendarConnected} />

                <button
                    className="w-10 h-10 rounded-full bg-mint flex items-center justify-center hover:bg-primary/10 transition-colors"
                    aria-label="Profil"
                >
                    <UserIcon />
                </button>
            </div>
        </header>
    )
}

function UserIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-secondary"
        >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    )
}
