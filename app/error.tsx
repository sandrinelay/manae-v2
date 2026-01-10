'use client'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-screen bg-mint flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <span className="font-quicksand text-3xl font-bold text-text-dark tracking-tight mb-8">
        manae
      </span>

      {/* Oups */}
      <h1 className="text-4xl font-bold text-red-500 mb-4">Oups !</h1>

      <h2 className="text-xl font-semibold text-text-dark mb-2">
        Une erreur est survenue
      </h2>

      <p className="text-text-muted mb-8 text-center max-w-sm">
        Pas de panique, ça arrive parfois.
        Tu peux réessayer ou revenir à l&apos;accueil.
      </p>

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          Réessayer
        </button>
        <a
          href="/clarte"
          className="px-6 py-3 border-2 border-primary text-primary rounded-xl font-medium hover:bg-primary/10 transition-colors"
        >
          Accueil
        </a>
      </div>

      {/* Debug info en dev */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-xl max-w-lg w-full">
          <p className="text-xs font-mono text-gray-600 break-all">
            {error.message}
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-gray-400 mt-2">
              Digest: {error.digest}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
