'use client'

import { useState } from 'react'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { CheckCircleIcon } from '@/components/ui/icons'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/set-password`
        }
      )

      if (resetError) {
        setError(resetError.message)
        return
      }

      setIsSuccess(true)
    } catch (err) {
      console.error('Reset password error:', err)
      setError('Une erreur est survenue. Réessaie.')
    } finally {
      setIsLoading(false)
    }
  }

  // État succès
  if (isSuccess) {
    return (
      <AuthLayout
        title="Email envoyé !"
        subtitle=""
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-text-dark mb-2">
            Si un compte existe avec cet email, tu recevras un lien pour réinitialiser ton mot de passe.
          </p>
          <p className="text-sm text-text-muted mb-6">
            Pense à vérifier tes spams !
          </p>
          <a
            href="/login"
            className="text-primary font-medium hover:underline"
          >
            Retour à la connexion
          </a>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Mot de passe oublié ?"
      subtitle="Entre ton email pour recevoir un lien de réinitialisation"
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

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={!email.trim() || isLoading}
        >
          {isLoading ? 'Envoi...' : 'Envoyer le lien'}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <a
          href="/login"
          className="text-sm text-text-muted hover:text-primary"
        >
          ← Retour à la connexion
        </a>
      </div>
    </AuthLayout>
  )
}
