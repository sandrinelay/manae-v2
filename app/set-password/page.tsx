'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

export default function SetPasswordPage() {
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  // Vérifier que l'utilisateur vient d'un lien d'invitation ou de reset
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()

      // Cas 1: Token dans le hash (invitation ou recovery Supabase)
      // URL format: /set-password#access_token=xxx&refresh_token=xxx&type=invite|recovery
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (!error) {
            setIsValidSession(true)
            setIsCheckingSession(false)
            // Nettoyer le hash de l'URL
            window.history.replaceState(null, '', window.location.pathname)
            return
          }
        }
      }

      // Cas 2: Code dans les query params (reset password)
      // URL format: /set-password?code=xxx
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
          setIsValidSession(true)
          setIsCheckingSession(false)
          return
        }
      }

      // Cas 3: Session déjà existante
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        setIsValidSession(true)
      } else {
        // Pas de session valide, rediriger vers login
        router.push('/login')
      }
      setIsCheckingSession(false)
    }

    checkSession()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase.auth.updateUser({
        password
      })

      if (updateError) {
        // Traduire les erreurs Supabase courantes
        const errorTranslations: Record<string, string> = {
          'New password should be different from the old password.': 'Le nouveau mot de passe doit être différent de l\'ancien.',
          'Password should be at least 6 characters.': 'Le mot de passe doit contenir au moins 6 caractères.',
        }
        setError(errorTranslations[updateError.message] || 'Une erreur est survenue. Réessaie.')
        return
      }

      // Récupérer l'utilisateur connecté
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        router.push('/login')
        return
      }

      // Marquer le mot de passe comme défini (upsert pour créer le profil si nécessaire)
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: authUser.id,
          email: authUser.email || '',
          password_set: true
        }, {
          onConflict: 'id'
        })

      if (upsertError) {
        console.error('Failed to update password_set:', upsertError)
      }

      // Vérifier si l'utilisateur a déjà fait l'onboarding
      const { data: userProfile } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('id', authUser.id)
        .maybeSingle()

      // Rediriger selon l'état de l'onboarding
      router.push(userProfile?.onboarding_completed ? '/clarte' : '/onboarding')
    } catch (err) {
      console.error('Set password error:', err)
      setError('Une erreur est survenue. Réessaie.')
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid = password.length >= 8 && password === confirmPassword

  // Loading state
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-mint flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  // Session invalide
  if (!isValidSession) {
    return null // Redirection en cours
  }

  return (
    <AuthLayout
      title="Bienvenue dans la beta !"
      subtitle="Crée ton mot de passe pour commencer"
    >
      <form onSubmit={handleSubmit}>
        <Input
          id="password"
          name="password"
          type="password"
          label="Mot de passe"
          placeholder="Min. 8 caractères"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          autoFocus
        />

        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          label="Confirmer le mot de passe"
          placeholder="Répète ton mot de passe"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          error={confirmPassword && password !== confirmPassword ? 'Les mots de passe ne correspondent pas' : undefined}
        />

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Indicateur de force */}
        {password && (
          <div className="mb-4">
            <div className="flex gap-1 mb-1">
              <div className={`h-1 flex-1 rounded ${password.length >= 8 ? 'bg-green-500' : 'bg-gray-200'}`} />
              <div className={`h-1 flex-1 rounded ${password.length >= 10 ? 'bg-green-500' : 'bg-gray-200'}`} />
              <div className={`h-1 flex-1 rounded ${password.length >= 12 && /[A-Z]/.test(password) ? 'bg-green-500' : 'bg-gray-200'}`} />
            </div>
            <p className="text-xs text-text-muted">
              {password.length < 8 ? 'Trop court' : password.length < 10 ? 'Correct' : 'Fort'}
            </p>
          </div>
        )}

        <Button
          type="submit"
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? 'Création...' : 'Créer mon compte'}
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-100">
        <p className="text-xs text-text-muted text-center">
          En créant ton compte, tu acceptes nos{' '}
          <a
            href="https://manae.app/legal/cgu"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            CGU
          </a>
          {' '}et notre{' '}
          <a
            href="https://manae.app/legal/confidentialite"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Politique de confidentialité
          </a>
        </p>
      </div>
    </AuthLayout>
  )
}
