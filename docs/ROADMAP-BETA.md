# Roadmap Beta - Manae v2

> Document de suivi des étapes pour rendre la web app 100% fonctionnelle et prête pour la beta publique.

---

## État actuel : ~70% fonctionnelle

### Ce qui est terminé
- [x] Onboarding (4 étapes)
- [x] Page Capture (mood + texte libre + analyse IA)
- [x] Page Clarté (dashboard avec Block/FullView pattern)
- [x] Page Profil (infos, préférences, connexions, légal)
- [x] CRUD items complet (tâches, notes, idées, courses)
- [x] Analyse IA des captures
- [x] Développement d'idées en projets
- [x] Google Calendar OAuth (base)
- [x] Système de design cohérent

---

## PHASE 1 : Critique (Avant beta publique)

### 1.1 Pages d'authentification

#### 1.1.1 Page Login (`/login`)
**Fichier à créer** : `app/login/page.tsx`

**Fonctionnalités** :
- Formulaire email + mot de passe
- Bouton "Se connecter"
- Lien "Mot de passe oublié ?" → `/forgot-password`
- Lien "Créer un compte" → `/signup`
- Option "Continuer avec Google" (OAuth)
- Gestion des erreurs (email invalide, mot de passe incorrect)
- Redirection vers `/clarte` après connexion

**Composants à créer** :
- `components/auth/LoginForm.tsx`
- `components/auth/SocialLoginButton.tsx`
- `components/auth/AuthLayout.tsx` (layout partagé login/signup)

**Logique** :
```typescript
// Utiliser Supabase Auth
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
})
```

---

#### 1.1.2 Page Signup (`/signup`)
**Fichier à créer** : `app/signup/page.tsx`

**Fonctionnalités** :
- Formulaire : prénom, nom, email, mot de passe, confirmation mot de passe
- Validation en temps réel :
  - Email format valide
  - Mot de passe min 8 caractères
  - Confirmation identique
- Checkbox CGU obligatoire avec lien
- Bouton "Créer mon compte"
- Option "Continuer avec Google"
- Lien "Déjà un compte ?" → `/login`
- Email de confirmation envoyé

**Composants à créer** :
- `components/auth/SignupForm.tsx`
- `components/auth/PasswordStrengthIndicator.tsx`

**Logique** :
```typescript
// 1. Créer l'utilisateur Supabase
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { first_name, last_name }
  }
})

// 2. Rediriger vers onboarding après confirmation email
```

---

#### 1.1.3 Page Mot de passe oublié (`/forgot-password`)
**Fichier à créer** : `app/forgot-password/page.tsx`

**Fonctionnalités** :
- Formulaire email uniquement
- Bouton "Envoyer le lien"
- Message de confirmation "Email envoyé si le compte existe"
- Lien retour vers `/login`

**Logique** :
```typescript
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://app.manae.app/reset-password'
})
```

---

#### 1.1.4 Page Reset Password (`/reset-password`)
**Fichier à créer** : `app/reset-password/page.tsx`

**Fonctionnalités** :
- Accessible uniquement via lien email (token dans URL)
- Formulaire : nouveau mot de passe + confirmation
- Validation force du mot de passe
- Redirection vers `/login` après succès

**Logique** :
```typescript
const { error } = await supabase.auth.updateUser({
  password: newPassword
})
```

---

#### 1.1.5 Composants Auth partagés

**`components/auth/AuthLayout.tsx`** :
- Logo Manae centré
- Fond mint
- Card blanche centrée
- Responsive mobile-first

**`components/auth/AuthInput.tsx`** :
- Input stylisé avec label
- État erreur avec message
- Icône optionnelle (email, lock)

**`components/auth/AuthButton.tsx`** :
- Bouton principal (primary)
- État loading avec spinner
- Disabled si formulaire invalide

---

### 1.2 Configuration PWA

#### 1.2.1 Manifest (`public/manifest.json`)
**Fichier à créer** : `public/manifest.json`

```json
{
  "name": "Manae - Ta charge mentale, enfin légère",
  "short_name": "Manae",
  "description": "L'app qui t'aide à capturer tes pensées et organiser ton quotidien",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F0FDFA",
  "theme_color": "#14B8A6",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Capturer",
      "url": "/capture",
      "icons": [{ "src": "/icons/capture-96x96.png", "sizes": "96x96" }]
    },
    {
      "name": "Ma clarté",
      "url": "/clarte",
      "icons": [{ "src": "/icons/clarte-96x96.png", "sizes": "96x96" }]
    }
  ]
}
```

---

#### 1.2.2 Icônes PWA
**Dossier à créer** : `public/icons/`

**Fichiers requis** :
- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`
- `apple-touch-icon.png` (180x180)
- `favicon.ico` (32x32)
- `capture-96x96.png` (shortcut)
- `clarte-96x96.png` (shortcut)

**Recommandation** : Utiliser un générateur comme https://realfavicongenerator.net/

---

#### 1.2.3 Meta tags dans layout
**Fichier à modifier** : `app/layout.tsx`

Ajouter dans `<head>` :
```tsx
<link rel="manifest" href="/manifest.json" />
<link rel="icon" href="/favicon.ico" sizes="32x32" />
<link rel="icon" href="/icons/icon-192x192.png" type="image/png" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
<meta name="theme-color" content="#14B8A6" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Manae" />
<meta name="description" content="L'app qui t'aide à capturer tes pensées et organiser ton quotidien" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
```

---

#### 1.2.4 Service Worker (optionnel pour beta)
**Fichier à créer** : `public/sw.js`

Pour la beta, un service worker minimal suffit :
```javascript
// Service worker minimal - cache des assets statiques
const CACHE_NAME = 'manae-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', (event) => {
  // Network-first strategy pour la beta
  event.respondWith(fetch(event.request))
})
```

**Enregistrement** dans `app/layout.tsx` :
```tsx
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
  }
}, [])
```

---

### 1.3 Pages d'erreur

#### 1.3.1 Page 404 (`not-found.tsx`)
**Fichier à créer** : `app/not-found.tsx`

```tsx
export default function NotFound() {
  return (
    <div className="min-h-screen bg-mint flex flex-col items-center justify-center p-6">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-xl font-semibold text-text-dark mb-2">
        Page introuvable
      </h2>
      <p className="text-text-muted mb-6 text-center">
        Cette page n'existe pas ou a été déplacée.
      </p>
      <a
        href="/clarte"
        className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
      >
        Retour à l'accueil
      </a>
    </div>
  )
}
```

---

#### 1.3.2 Page Erreur globale (`error.tsx`)
**Fichier à créer** : `app/error.tsx`

```tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-mint flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold text-red-500 mb-4">Oups !</h1>
      <h2 className="text-xl font-semibold text-text-dark mb-2">
        Une erreur est survenue
      </h2>
      <p className="text-text-muted mb-6 text-center max-w-md">
        Pas de panique, ça arrive. Tu peux réessayer ou revenir à l'accueil.
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
    </div>
  )
}
```

---

### 1.4 Protection des routes (Middleware)

#### 1.4.1 Modifier le middleware
**Fichier à modifier** : `middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes publiques (accessibles sans auth)
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/api/auth',
]

// Routes qui nécessitent d'être NON connecté
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Vérifier si route publique
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route))

  // Si non connecté et route protégée → rediriger vers login
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Si connecté et sur page auth → rediriger vers clarte
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/clarte', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## PHASE 2 : Haute priorité (Bonne UX)

### 2.1 Intégration des quotas IA

#### 2.1.1 Modifier `/api/analyze-v2`
**Fichier à modifier** : `app/api/analyze-v2/route.ts`

Ajouter au début :
```typescript
import { checkAIQuota, incrementAIUsage } from '@/services/quota/quota.service'

// Dans le handler POST :
const quotaCheck = await checkAIQuota(userId, 'analyze')
if (!quotaCheck.allowed) {
  return NextResponse.json(
    { error: 'Quota IA dépassé', remaining: 0 },
    { status: 429 }
  )
}

// Après succès de l'analyse :
await incrementAIUsage(userId, 'analyze')
```

---

#### 2.1.2 Modifier `/api/develop-idea`
**Fichier à modifier** : `app/api/develop-idea/route.ts`

Même logique avec `operation: 'develop'`

---

#### 2.1.3 UI affichage quota
**Composant à créer** : `components/ui/QuotaIndicator.tsx`

```tsx
interface QuotaIndicatorProps {
  used: number
  total: number
  label?: string
}

export function QuotaIndicator({ used, total, label = 'Analyses IA' }: QuotaIndicatorProps) {
  const remaining = total - used
  const percentage = (used / total) * 100

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            percentage > 80 ? 'bg-red-500' : 'bg-primary'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-text-muted whitespace-nowrap">
        {remaining} {label} restantes
      </span>
    </div>
  )
}
```

**Afficher dans** : Page Capture (en bas) et Page Profil

---

### 2.2 Favicon et meta tags SEO

#### 2.2.1 Fichiers à créer
- `public/favicon.ico` (32x32)
- `public/favicon-16x16.png`
- `public/favicon-32x32.png`

#### 2.2.2 Fichier robots.txt
**Fichier à créer** : `public/robots.txt`

```
User-agent: *
Allow: /

Sitemap: https://app.manae.app/sitemap.xml
```

---

### 2.3 Notifications toast

#### 2.3.1 Installer une librairie
```bash
npm install sonner
```

#### 2.3.2 Configurer dans layout
**Fichier à modifier** : `app/layout.tsx`

```tsx
import { Toaster } from 'sonner'

// Dans le return :
<Toaster
  position="top-center"
  toastOptions={{
    style: {
      background: 'white',
      border: '1px solid #E5E7EB',
      borderRadius: '12px',
    },
  }}
/>
```

#### 2.3.3 Utilisation
```tsx
import { toast } from 'sonner'

// Succès
toast.success('Tâche créée !')

// Erreur
toast.error('Une erreur est survenue')

// Info
toast.info('Connexion Google Calendar requise')
```

---

## PHASE 3 : Moyenne priorité (Améliorations)

### 3.1 Sync Google Calendar bidirectionnelle

**À implémenter** :
1. Fetch des événements existants du calendrier
2. Afficher les conflits dans la modale de planification
3. Mise à jour des événements si la tâche est modifiée
4. Suppression de l'événement si la tâche est supprimée

---

### 3.2 Refresh token Google automatique

**Logique** :
```typescript
// Dans calendar.service.ts
async function getValidToken() {
  const tokens = getStoredTokens()

  if (isTokenExpired(tokens.access_token)) {
    const newTokens = await refreshGoogleToken(tokens.refresh_token)
    storeTokens(newTokens)
    return newTokens.access_token
  }

  return tokens.access_token
}
```

---

### 3.3 Logging centralisé (Sentry)

```bash
npm install @sentry/nextjs
```

Configurer dans `sentry.client.config.ts` et `sentry.server.config.ts`

---

## Checklist finale avant beta

### Technique
- [ ] Pages auth (login, signup, forgot-password, reset-password)
- [ ] PWA manifest + icônes
- [ ] Service worker minimal
- [ ] Pages 404 et 500
- [ ] Middleware protection routes
- [ ] Quotas IA intégrés
- [ ] Notifications toast
- [ ] Favicon + meta SEO

### Légal
- [ ] CGU accessibles
- [ ] Politique de confidentialité
- [ ] Mentions légales
- [ ] Consentement cookies (si applicable)

### UX
- [ ] Test sur mobile (iOS Safari, Android Chrome)
- [ ] Test installation PWA
- [ ] Test flow complet : signup → onboarding → capture → clarté
- [ ] Test déconnexion / reconnexion
- [ ] Test quota IA dépassé

### Performance
- [ ] Lighthouse score > 90
- [ ] Images optimisées (WebP)
- [ ] Fonts préchargées

---

## Estimation temps de développement

| Phase | Tâches | Temps estimé |
|-------|--------|--------------|
| 1.1 | Pages Auth | 4-6h |
| 1.2 | PWA Config | 2-3h |
| 1.3 | Pages erreur | 1h |
| 1.4 | Middleware | 1-2h |
| 2.1 | Quotas IA | 2-3h |
| 2.2 | Favicon/SEO | 1h |
| 2.3 | Toast notifications | 1h |
| 3.x | Améliorations | 4-6h |
| **Total** | | **16-23h** |

---

## Notes

- **Priorité absolue** : Phase 1 (auth + PWA + erreurs + middleware)
- **Pour la beta** : Phase 1 + 2 suffisent
- **Phase 3** : Peut attendre les retours utilisateurs

Document créé le : $(date)
Dernière mise à jour : -
