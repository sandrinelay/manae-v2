'use client'

import { CalendarIcon } from '@/components/ui/icons'

interface GoogleCalendarCTAProps {
    onConnect: () => void
    isConnecting?: boolean
}

export default function GoogleCalendarCTA({ onConnect, isConnecting = false }: GoogleCalendarCTAProps) {
    return (
        <div className="alert-box animate-fadeIn">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--accent-medium)] flex items-center justify-center flex-shrink-0">
                    <CalendarIcon className="w-5 h-5 text-[var(--accent)]" />
                </div>

                <div className="flex-1">
                    <h3 className="alert-box-title font-quicksand">
                        Connecte ton agenda
                    </h3>
                    <p className="alert-box-text mb-3">
                        Pour des suggestions optimales, connecte ton Google Calendar
                    </p>

                    <button
                        onClick={onConnect}
                        disabled={isConnecting}
                        className="bg-white hover:bg-gray-50 text-[var(--accent-dark)] font-medium py-2 px-4 rounded-lg border border-[var(--accent-medium)] transition-colors text-sm font-quicksand disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isConnecting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-[var(--accent-medium)] border-t-[var(--accent)] rounded-full animate-spin" />
                                Connexion en cours...
                            </>
                        ) : (
                            'Connecter Google Calendar'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}