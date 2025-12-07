'use client'

interface CalendarBadgeProps {
    connected: boolean
}

export default function CalendarBadge({ connected }: CalendarBadgeProps) {
    return (
        <button
            className="relative group"
            aria-label={connected ? "Agenda connecté" : "Agenda non connecté"}
        >
            <div className="w-10 h-10 rounded-full bg-mint flex items-center justify-center">
                <CalendarIcon connected={connected} />
            </div>

            {/* Tooltip on hover */}
            <div className="absolute top-full mt-2 right-0 bg-secondary text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {connected ? "Agenda connecté" : "Agenda non connecté"}
            </div>
        </button>
    )
}

function CalendarIcon({ connected }: { connected: boolean }) {
    return (
        <div className="relative">
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={connected ? "text-primary" : "text-text-muted"}
            >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
            </svg>

            {connected ? (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-white" />
            ) : (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white">
                    <span className="absolute inset-0 flex items-center justify-center text-white text-[8px] font-bold">!</span>
                </div>
            )}
        </div>
    )
}