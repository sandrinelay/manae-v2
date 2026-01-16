'use client'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-mint flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8">
        <span className="font-quicksand text-4xl font-bold text-text-dark tracking-tight">
          manae
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-text-dark mb-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-text-muted">
              {subtitle}
            </p>
          )}
        </div>

        {/* Content */}
        {children}
      </div>

      {/* Footer */}
      <p className="mt-6 text-sm text-text-muted">
        Ta charge mentale, enfin légère.
      </p>
    </div>
  )
}
