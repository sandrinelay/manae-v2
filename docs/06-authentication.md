# 06 - Authentification

> Documentation du système d'authentification Supabase

---

## 1. Stack Auth

### 1.1 Provider

**Supabase Auth** (basé sur GoTrue)

**Features** :
- Email/Password
- OAuth (Google)
- Magic Links
- Sessions JWT
- Row Level Security (RLS)

---

## 2. Middleware (`proxy.ts`)

### 2.1 Rôle

Le fichier `proxy.ts` agit comme middleware auth Next.js.

**Responsabilités** :
1. Rafraîchir session Supabase sur chaque requête
2. Rediriger utilisateurs non authentifiés vers `/login`
3. Bloquer accès pages auth si déjà connecté
4. Forcer onboarding si incomplet
5. Forcer définition mot de passe (invitations email)

### 2.2 Routes Publiques

```typescript
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/set-password',
  '/invitation',
  '/offline',
  '/api',
  '/auth/google/callback',
]
```

### 2.3 Routes Auth

```typescript
const AUTH_ROUTES = [
  '/login',
  '/signup',
]
```

Si user authentifié sur ces routes → redirect `/capture`.

### 2.4 Logique Principale

```typescript
export async function proxy(request: NextRequest) {
  // 1. Créer client Supabase avec cookies
  const supabase = createServerClient(...)

  // 2. Refresh session
  const { data: { user } } = await supabase.auth.getUser()

  // 3. Vérif route publique
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route))

  // 4. Si non connecté et route protégée → login
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  // 5. Si connecté sur page auth → capture
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/capture', request.url))
  }

  // 6. Vérif onboarding + password_set
  if (user && !pathname.startsWith('/onboarding') && !pathname.startsWith('/set-password')) {
    const { data: profile } = await supabase
      .from('users')
      .select('onboarding_completed, password_set')
      .eq('id', user.id)
      .single()

    if (profile && profile.password_set === false) {
      return NextResponse.redirect(new URL('/set-password', request.url))
    }

    if (profile && !profile.onboarding_completed) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  return supabaseResponse
}
```

### 2.5 Matcher Config

```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest\\.json|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
```

Exclut assets statiques, images, SW.

---

## 3. Client Supabase

### 3.1 Browser Client (`lib/supabase/client.ts`)

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Usage** : Dans composants client (`'use client'`).

### 3.2 Server Client (`lib/supabase/server.ts`)

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

**Usage** : Dans Server Components et API Routes.

---

## 4. Hook `useAuth()`

### 4.1 Objectif

Expose état auth dans composants client.

### 4.2 Implémentation (`hooks/useAuth.ts`)

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [firstName, setFirstName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // 1. Récupérer user actuel
    const initAuth = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      if (currentUser) {
        setUser(currentUser)

        // Fetch first_name
        const { data: profile } = await supabase
          .from('users')
          .select('first_name')
          .eq('id', currentUser.id)
          .single()

        if (profile) setFirstName(profile.first_name)
      } else {
        // Sign in anonymously si pas d'user
        const { data, error } = await supabase.auth.signInAnonymously()
        if (!error && data.user) {
          setUser(data.user)
        }
      }

      setIsLoading(false)
    }

    initAuth()

    // 2. Écouter changements auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const isAnonymous = user?.is_anonymous ?? false

  return { user, firstName, isLoading, isAnonymous }
}
```

### 4.3 Usage

```tsx
'use client'

export function ProfilePage() {
  const { user, firstName, isLoading, isAnonymous } = useAuth()

  if (isLoading) return <Spinner />
  if (!user) return <LoginPrompt />

  return <div>Bonjour {firstName} !</div>
}
```

---

## 5. Flux Authentification

### 5.1 Inscription Email/Password

```
1. User → /signup
2. Saisit email, password, prénom, nom
3. POST supabase.auth.signUp({ email, password })
4. Supabase envoie email confirmation
5. User clique lien → email vérifié
6. Auto-login → redirect /onboarding
```

**Code** :
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      first_name: firstName,
      last_name: lastName
    }
  }
})
```

### 5.2 Connexion Email/Password

```
1. User → /login
2. Saisit email, password
3. POST supabase.auth.signInWithPassword({ email, password })
4. Si succès → session créée → redirect /capture
```

**Code** :
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
})
```

### 5.3 OAuth Google

**Flow** :

```
1. User clique "Se connecter avec Google"
2. supabase.auth.signInWithOAuth({ provider: 'google', ... })
3. Redirect Google OAuth consent
4. User accepte
5. Callback /auth/google/callback avec code
6. POST /api/auth/google (code → tokens)
7. Tokens stockés localStorage
8. Redirect /onboarding ou /capture
```

**Code** :
```typescript
// 1. Initier OAuth
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/google/callback`,
    scopes: 'https://www.googleapis.com/auth/calendar'
  }
})

// 2. Callback (API route)
// POST /api/auth/google
const response = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  body: JSON.stringify({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri,
    grant_type: 'authorization_code'
  })
})

const tokens = await response.json()
// { access_token, refresh_token, expires_in }
```

### 5.4 Déconnexion

```typescript
await supabase.auth.signOut()
// Session supprimée → redirect /login
```

---

## 6. Onboarding

### 6.1 Flux 4 Étapes

**Page** : `/onboarding`

| Étape | Page | Contenu |
|-------|------|---------|
| 1 | `/onboarding` | Saisie prénom/nom |
| 2 | `/onboarding/step2` | Sélection contextes (Perso, Famille, Travail) |
| 3 | `/onboarding/step3` | Sélection moments d'énergie (Matin, Après-midi, Soir) |
| 4 | `/onboarding/step4` | Connexion Google Calendar (optionnelle) |

**Validation finale** :

```typescript
// Update user profile
await supabase
  .from('users')
  .update({ onboarding_completed: true })
  .eq('id', user.id)

// Redirect /capture
router.push('/capture')
```

### 6.2 Étape 4 - Google Calendar

**Optionnelle** : User peut skip.

Si connecté :
- Demande scopes Google Calendar
- Stocke tokens
- Permet planification intelligente

---

## 7. Invitation Email

### 7.1 Flow

```
1. Admin invite user via waitlist
2. Email envoyé avec magic link
3. User clique → auto-login
4. Redirect /set-password
5. User définit password
6. Update `users.password_set = true`
7. Redirect /onboarding
```

### 7.2 Page `/set-password`

```tsx
'use client'

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const supabase = createClient()

  const handleSubmit = async () => {
    // Update password
    const { error } = await supabase.auth.updateUser({
      password
    })

    if (!error) {
      // Update flag DB
      await supabase
        .from('users')
        .update({ password_set: true })
        .eq('id', user.id)

      router.push('/onboarding')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button type="submit">Définir mon mot de passe</button>
    </form>
  )
}
```

---

## 8. Row Level Security (RLS)

### 8.1 Principe

Chaque table a des **policies RLS** qui restreignent l'accès aux données selon `auth.uid()`.

**Exemple** (`items`) :

```sql
-- Lecture
CREATE POLICY "Users can view own items" ON items
  FOR SELECT USING (auth.uid() = user_id);

-- Insertion
CREATE POLICY "Users can insert own items" ON items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Mise à jour
CREATE POLICY "Users can update own items" ON items
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Suppression
CREATE POLICY "Users can delete own items" ON items
  FOR DELETE USING (auth.uid() = user_id);
```

**Résultat** : User peut uniquement voir/modifier SES items.

### 8.2 Vérification Auth API Routes

```typescript
// app/api/analyze-v2/route.ts
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Continue...
}
```

---

## 9. Mode Développement

### 9.1 Auto-login Dev

En mode dev, un composant `AuthInitializer` auto-connecte avec `dev@manae.app` :

```tsx
// components/auth/AuthInitializer.tsx (hypothétique)
'use client'

useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    const supabase = createClient()
    supabase.auth.signInWithPassword({
      email: 'dev@manae.app',
      password: 'dev123'
    })
  }
}, [])
```

---

## 10. Sécurité

### 10.1 Bonnes Pratiques

- ✅ **RLS activé** sur toutes les tables
- ✅ **Vérif auth** dans chaque API route
- ✅ **Tokens refresh** automatique via middleware
- ✅ **HTTPS** obligatoire (Vercel)
- ✅ **Secrets** en variables d'env (jamais commit)

### 10.2 Tokens Google

**Stockage** : `localStorage` (côté client).

**Refresh** :
```typescript
// Refresh token si expiré
if (Date.now() >= tokenExpiry) {
  const response = await fetch('/api/auth/google/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token })
  })

  const { access_token, expires_in } = await response.json()
  // Update localStorage
}
```

---

*Document technique - Authentification Manae*
