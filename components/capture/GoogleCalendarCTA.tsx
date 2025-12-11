'use client'

interface GoogleCalendarCTAProps {
    onConnect: () => void
    isConnecting?: boolean
}

export default function GoogleCalendarCTA({ onConnect, isConnecting = false }: GoogleCalendarCTAProps) {
    return (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 animate-fadeIn">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <AlertIcon />
                </div>

                <div className="flex-1">
                    <h3 className="text-text-dark font-semibold text-sm mb-1 font-quicksand">
                        Connecte ton agenda
                    </h3>
                    <p className="text-text-medium text-xs mb-3">
                        Pour des suggestions optimales, connecte ton Google Calendar
                    </p>

                    <button
                        onClick={onConnect}
                        disabled={isConnecting}
                        className="bg-white hover:bg-gray-50 text-text-dark font-medium py-2 px-4 rounded-lg border border-orange-200 transition-colors text-sm font-quicksand disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isConnecting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" />
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

function AlertIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-orange-500"
        >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
        </svg>
    )
}