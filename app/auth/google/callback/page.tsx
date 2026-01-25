'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { exchangeCodeForToken } from '@/lib/googleCalendar'
import { updateUserProfile } from '@/services/supabaseService'

function GoogleCallbackContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  console.log('[Callback] Page loaded, URL:', typeof window !== 'undefined' ? window.location.href : 'SSR')

  useEffect(() => {
    console.log('[Callback] useEffect running, code:', searchParams.get('code'), 'error:', searchParams.get('error'))
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    const handleCallback = async () => {
      if (code) {
        // Cas 1: On est dans une popup avec window.opener
        if (window.opener) {
          window.opener.postMessage(
            { type: 'GOOGLE_AUTH_SUCCESS', code },
            window.location.origin
          )
          window.close()
          return
        }

        // Cas 2: On est dans la fenêtre principale (pas de popup)
        // Traiter le code directement ici
        try {
          const tokens = await exchangeCodeForToken(code)
          const tokensWithExpiry = {
            ...tokens,
            expires_at: Date.now() + (tokens.expires_in * 1000)
          }
          localStorage.setItem('google_tokens', JSON.stringify(tokensWithExpiry))

          // Marquer l'onboarding comme terminé
          await updateUserProfile({ onboarding_completed: true })

          setStatus('success')
          // Rediriger vers capture après un court délai
          setTimeout(() => {
            window.location.href = '/capture'
          }, 1000)
        } catch (err) {
          console.error('Error exchanging code:', err)
          setStatus('error')
          setErrorMessage('Erreur lors de la connexion')
        }
      } else if (error) {
        if (window.opener) {
          window.opener.postMessage(
            { type: 'GOOGLE_AUTH_ERROR', error },
            window.location.origin
          )
          window.close()
        } else {
          setStatus('error')
          setErrorMessage(error)
        }
      }
    }

    handleCallback()
  }, [searchParams])

  if (status === 'success') {
    return (
      <div className="text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-text-dark font-medium">Connexion réussie !</p>
        <p className="text-text-medium text-sm mt-2">Redirection...</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p className="text-text-dark font-medium">Erreur de connexion</p>
        <p className="text-text-medium text-sm mt-2">{errorMessage}</p>
        <button
          onClick={() => window.location.href = '/onboarding/step4'}
          className="mt-4 text-primary underline"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
      <p className="text-text-medium">Connexion en cours...</p>
    </div>
  )
}

export default function GoogleCallbackPage() {
  return (
    <div className="min-h-screen bg-mint flex items-center justify-center p-6">
      <Suspense fallback={
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-text-medium">Chargement...</p>
        </div>
      }>
        <GoogleCallbackContent />
      </Suspense>
    </div>
  )
}
