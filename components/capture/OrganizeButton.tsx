'use client'

interface OrganizeButtonProps {
    count: number
    onClick: () => void
    disabled?: boolean
}

export default function OrganizeButton({ count, onClick, disabled }: OrganizeButtonProps) {
    if (count === 0) return null

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="w-full bg-primary hover:bg-primary-dark active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl shadow-md transition-all font-quicksand text-base animate-fadeIn"
        >
            <div className="flex items-center justify-center gap-2">
                <SparklesIcon />
                <span>Organiser maintenant</span>
            </div>
        </button>
    )
}

function SparklesIcon() {
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
        >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
        </svg>
    )
}