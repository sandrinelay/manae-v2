// import CalendarBadge from './CalendarBadge'

export default function Header() {
    return (
        <header className="bg-white border-b border-border px-4 py-3 flex items-center justify-between">
            <h1 className="font-quicksand text-2xl font-bold text-secondary">
                Manae
            </h1>

            <div className="flex items-center gap-3">
                {/* <CalendarBadge connected={false} /> */}

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