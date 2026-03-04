'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { VoiceButton } from './VoiceButton'

const HIDDEN_ROUTES = ['/capture', '/login', '/signup', '/onboarding', '/set-password', '/forgot-password']

export function VoiceButtonGlobal() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading } = useAuth()

  // Ne pas afficher si non connecté, en chargement, ou sur une route masquée
  if (isLoading || !user) return null
  if (HIDDEN_ROUTES.some((route) => pathname.startsWith(route))) return null

  const handleTranscript = (text: string) => {
    localStorage.setItem('manae_voice_transcript', text)
    router.push('/capture')
  }

  return <VoiceButton variant="floating" onTranscript={handleTranscript} />
}
