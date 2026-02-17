'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/clarte'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Email ou mot de passe incorrect')
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Vérifie tes emails pour confirmer ton compte')
        } else {
          setError(authError.message)
        }
        return
      }

      if (data.user) {
        // Vérifier si l'utilisateur a complété l'onboarding
        const { data: profile } = await supabase
          .from('users')
          .select('onboarding_completed')
          .eq('id', data.user.id)
          .single()

        if (profile?.onboarding_completed) {
          router.push(redirectTo)
        } else {
          router.push('/onboarding')
        }
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Une erreur est survenue. Réessaie.')
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid = email.trim() && password.length >= 6

  return (
    <AuthLayout
      title="Bienvenue sur Manae !"
      subtitle="Connecte-toi pour retrouver ta clarté"
    >
      <form onSubmit={handleSubmit}>
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          placeholder="ton@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
        />

        <Input
          id="password"
          name="password"
          type="password"
          label="Mot de passe"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? 'Connexion...' : 'Se connecter'}
        </Button>
      </form>

      {/* Lien mot de passe oublié */}
      <div className="mt-4 text-center">
        <a
          href="/forgot-password"
          className="text-sm text-primary hover:underline"
        >
          Mot de passe oublié ?
        </a>
      </div>

      {/* Lien inscription */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <p className="text-sm text-text-muted text-center">
          Pas encore de compte ?{' '}
          <a
            href="/signup"
            className="text-primary hover:underline font-medium"
          >
            Inscris-toi
          </a>
        </p>
      </div>
    </AuthLayout>
  )
}

function LoginLoading() {
  return (
    <div className="min-h-screen bg-mint flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  )
}
