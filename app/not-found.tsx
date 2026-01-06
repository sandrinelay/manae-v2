import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-mint flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <span className="font-quicksand text-3xl font-bold text-text-dark tracking-tight mb-8">
        manae
      </span>

      {/* 404 */}
      <h1 className="text-7xl font-bold text-primary mb-4">404</h1>

      <h2 className="text-xl font-semibold text-text-dark mb-2">
        Page introuvable
      </h2>

      <p className="text-text-muted mb-8 text-center max-w-sm">
        Cette page n'existe pas ou a été déplacée.
        Pas de panique, on te ramène au bon endroit !
      </p>

      <Link
        href="/clarte"
        className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
      >
        Retour à l'accueil
      </Link>
    </div>
  )
}
