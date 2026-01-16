'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Si des tokens sont présents dans le hash (invitation Supabase),
    // rediriger vers /set-password avec le hash
    if (window.location.hash && window.location.hash.includes('access_token')) {
      router.replace('/set-password' + window.location.hash)
      return
    }

    // Sinon, rediriger vers /clarte (le proxy gère l'auth)
    router.replace('/clarte')
  }, [router])

  return (
    <div className="min-h-screen bg-mint flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  )
}
