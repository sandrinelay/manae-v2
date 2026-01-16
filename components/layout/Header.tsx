'use client'

import { useSyncExternalStore, useCallback } from 'react'
import CalendarBadge from '@/lib/layout/CalendarBadge'
import Link from 'next/link'

interface HeaderProps {
    userName?: string
}

// Helper pour lire le statut Google Calendar depuis localStorage
function getCalendarSnapshot() {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem('google_tokens')
}

function getServerSnapshot() {
    return false
}

export default function Header({ userName }: HeaderProps) {
    // Subscribe aux changements (storage event + custom event)
    const subscribe = useCallback((callback: () => void) => {
        const handleConnectionChange = () => callback()

        window.addEventListener('storage', callback)
        window.addEventListener('calendar-connection-changed', handleConnectionChange)

        return () => {
            window.removeEventListener('storage', callback)
            window.removeEventListener('calendar-connection-changed', handleConnectionChange)
        }
    }, [])

    const isCalendarConnected = useSyncExternalStore(
        subscribe,
        getCalendarSnapshot,
        getServerSnapshot
    )

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
