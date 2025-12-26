'use client'

interface AppHeaderProps {
  userName?: string
}

export function AppHeader({ userName }: AppHeaderProps) {
  const displayName = userName || 'toi'

  return (
    <header className="bg-white px-6 py-4 flex items-center justify-between">
      {/* Logo */}
      <span className="font-quicksand text-2xl font-bold text-text-dark tracking-tight">
        manae
      </span>

      {/* Greeting */}
      <span className="text-sm text-text-muted">
        Bonjour {displayName}
      </span>
    </header>
  )
}
