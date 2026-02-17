'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { Sparkles } from 'lucide-react'

const MAX_FOUNDERS = 100

export default function SignupPage() {
  const router = useRouter()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [foundersCount, setFoundersCount] = useState<number | null>(null)
  const [isCheckingFounders, setIsCheckingFounders] = useState(true)
  const [emailSent, setEmailSent] = useState(false)

  // Vérifier le nombre de founders au chargement
  useEffect(() => {
    const checkFoundersCount = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.rpc('count_founders')

        if (!error && typeof data === 'number') {
          setFoundersCount(data)
        }
      } catch (err) {
        console.error('Failed to count founders:', err)
      } finally {
        setIsCheckingFounders(false)
      }
    }

    checkFoundersCount()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validations
    if (!firstName.trim() || !lastName.trim()) {
      setError('Prénom et nom sont requis')
      return
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      // Vérifier à nouveau le nombre de founders (protection contre race condition)
      const { data: currentCount } = await supabase.rpc('count_founders')
      const isFounder = typeof currentCount === 'number' && currentCount < MAX_FOUNDERS

      // Créer le compte Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim()
          }
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('Cet email est déjà utilisé. Connecte-toi ou utilise un autre email.')
        } else {
          setError(authError.message)
        }
        return
      }

      if (!authData.user) {
        setError('Une erreur est survenue lors de la création du compte')
        return
      }

      // Le profil et la subscription sont créés automatiquement par le trigger Supabase
      // Stocker le statut founder pour l'afficher dans l'onboarding
      if (isFounder) {
        localStorage.setItem('manae_is_founder', 'true')
      }

      // Si pas de session → email de confirmation requis
      if (!authData.session) {
        setEmailSent(true)
        return
      }

      // Si session directe → rediriger vers l'onboarding
      router.push('/onboarding')
    } catch (err) {
      console.error('Signup error:', err)
      setError('Une erreur est survenue. Réessaie.')
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    password.length >= 8

  const spotsRemaining = foundersCount !== null ? MAX_FOUNDERS - foundersCount : null
  const isFull = spotsRemaining !== null && spotsRemaining <= 0

  // Email de confirmation envoyé
  if (emailSent) {
    return (
      <AuthLayout
        title="Vérifie tes emails"
        subtitle="Un email de confirmation a été envoyé"
      >
        <div className="text-center">
          <div className="alert-box mb-6">
            <p className="alert-box-text">
              Un lien de confirmation a été envoyé à <br></br><strong>{email}</strong>.<br></br>
              Clique dessus pour activer ton compte.
            </p>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            Tu n&apos;as pas reçu l&apos;email ? Vérifie tes spams ou{' '}
            <button
              onClick={() => setEmailSent(false)}
              className="text-[var(--color-primary)] hover:underline"
            >
              réessaie avec un autre email
            </button>
          </p>
        </div>
      </AuthLayout>
    )
  }

  // Loading state
  if (isCheckingFounders) {
    return (
      <div className="min-h-screen bg-mint flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <AuthLayout
      title="Rejoins Manae"
      subtitle="Crée ton compte en quelques secondes"
    >
      {/* Badge founders */}
      {spotsRemaining !== null && spotsRemaining > 0 && (
        <div className="alert-box mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
            <div>
              <p className="alert-box-title">
                Offre Early Adopters
              </p>
              <p className="alert-box-text">
                Plus que {spotsRemaining} place{spotsRemaining > 1 ? 's' : ''} pour bénéficier du plan Plus gratuit à vie !
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Message si complet */}
      {isFull && (
        <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-xl">
          <p className="text-sm text-gray-600">
            L&apos;offre Early adopters est terminée, mais tu peux toujours créer ton compte gratuitement.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              id="firstName"
              name="firstName"
              type="text"
              label="Prénom"
              placeholder="Lena"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              autoFocus
            />
          </div>
          <div className="flex-1">
            <Input
              id="lastName"
              name="lastName"
              type="text"
              label="Nom"
              placeholder="Dupont"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
            />
          </div>
        </div>

        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          placeholder="lena@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <Input
          id="password"
          name="password"
          type="password"
          label="Mot de passe"
          placeholder="Min. 8 caractères"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Indicateur de force du mot de passe */}
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

      {/* Lien connexion */}
      <div className="mt-4 text-center">
        <p className="text-sm text-text-muted">
          Déjà un compte ?{' '}
          <a
            href="/login"
            className="text-primary hover:underline font-medium"
          >
            Connecte-toi
          </a>
        </p>
      </div>

      {/* CGU */}
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

// Helper pour calculer le prochain lundi
function getNextMonday(): string {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  const nextMonday = new Date(now)
  nextMonday.setDate(now.getDate() + daysUntilMonday)
  return nextMonday.toISOString().split('T')[0]
}
