'use client'

import { useState, useEffect } from 'react'
import CalendarBadge from '@/lib/layout/CalendarBadge'
import Link from 'next/link'

interface HeaderProps {
    userName?: string
}

export default function Header({ userName }: HeaderProps) {
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
        <header className="bg-white border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-50">
            <Link href="/capture" className="font-quicksand text-2xl font-bold text-text-dark tracking-tight">
                manae
            </Link>

            <div className="flex items-center gap-4">
                <CalendarBadge connected={isCalendarConnected} />

                {userName && (
                    <span className="text-sm text-text-muted hidden sm:block">
                        {userName}
                    </span>
                )}

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
