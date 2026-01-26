# 🚀 Guide de Déploiement

> Procédure complète pour déployer Manae en production sur Vercel

---

## 1. Prérequis

### 1.1 Comptes Nécessaires

- [ ] **Vercel** : Compte créé (https://vercel.com)
- [ ] **Supabase** : Projet prod créé (https://supabase.com)
- [ ] **OpenAI** : API key avec quota suffisant
- [ ] **Google Cloud** : OAuth credentials prod
- [ ] **Domaine** : `my.manae.app` configuré

### 1.2 Accès Nécessaires

- [ ] Push access au repo GitHub
- [ ] Admin Vercel project
- [ ] Admin Supabase project
- [ ] Admin Google Cloud Console

---

## 2. Configuration Supabase Production

### 2.1 Créer Projet Supabase Prod

1. Aller sur https://supabase.com/dashboard
2. Cliquer "New project"
3. Nom : `manae-production`
4. Région : `Europe (Frankfurt)` ou proche utilisateurs
5. Database password : **Générer et sauvegarder**
6. Attendre initialisation (~2 minutes)

### 2.2 Récupérer Credentials

```
Project Settings → API
```

Noter :
- **Project URL** : `https://xxx.supabase.co`
- **anon public key** : `eyJhbGc...`
- **service_role key** : `eyJhbGc...` (⚠️ SECRET)

### 2.3 Appliquer Migrations

**Depuis le CLI** :

```bash
# Installer Supabase CLI
npm install -g supabase

# Login
supabase login

# Link projet prod
supabase link --project-ref xxx

# Appliquer toutes les migrations
supabase db push
```

**Ou via Dashboard** :

1. SQL Editor
2. Copier/coller chaque migration de `supabase/migrations/`
3. Exécuter dans l'ordre chronologique

### 2.4 Vérifier Tables & Policies

```sql
-- Lister toutes les tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Vérifier RLS activé partout
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
-- rowsecurity doit être 't' (true)
```

### 2.5 Configurer Auth

**Email Templates** :

1. Authentication → Email Templates
2. Customiser "Invite user" :

```
Subject: Bienvenue dans Manae ! 🎉

Bonjour {{ .FirstName }},

Tu fais partie des premiers utilisateurs de Manae !

Clique ici pour créer ton compte :
{{ .ConfirmationURL }}

Ce lien expire dans 24h.

À bientôt,
L'équipe Manae
```

3. Customiser "Reset Password" si nécessaire

**Auth Providers** :

1. Authentication → Providers
2. Activer **Email** (par défaut)
3. Activer **Google OAuth** :
   - Client ID : (depuis Google Cloud Console)
   - Client Secret : (depuis Google Cloud Console)
   - Redirect URL : `https://xxx.supabase.co/auth/v1/callback`

---

## 3. Configuration Google Cloud (OAuth)

### 3.1 Créer Projet Google Cloud

1. Aller sur https://console.cloud.google.com
2. Créer nouveau projet : "Manae Production"
3. Activer APIs :
   - Google Calendar API
   - Google+ API (pour OAuth)

### 3.2 Configurer OAuth Consent Screen

1. APIs & Services → OAuth consent screen
2. Type : **External**
3. App name : **Manae**
4. User support email : [ton email]
5. Logo : [optionnel]
6. Authorized domains : `manae.app`
7. Developer contact : [ton email]
8. Scopes : `email`, `profile`, `https://www.googleapis.com/auth/calendar`

### 3.3 Créer OAuth Credentials

1. APIs & Services → Credentials
2. Create Credentials → OAuth 2.0 Client ID
3. Application type : **Web application**
4. Name : `Manae Production`
5. Authorized JavaScript origins :
   - `https://my.manae.app`
6. Authorized redirect URIs :
   - `https://my.manae.app/onboarding/step4/callback`
   - `https://my.manae.app/auth/google/callback`
7. Créer

Noter :
- **Client ID** : `xxx.apps.googleusercontent.com`
- **Client Secret** : `GOCSPX-xxx`

---

## 4. Configuration OpenAI

### 4.1 Créer API Key Production

1. Aller sur https://platform.openai.com/api-keys
2. Créer nouvelle clé : "Manae Production"
3. Noter la clé : `sk-proj-xxx`
4. ⚠️ **Ne jamais partager cette clé**

### 4.2 Configurer Quotas

1. Settings → Limits
2. Monthly budget : Définir limite (ex: $50/mois)
3. Email alerts : Activer à 80% et 100%

### 4.3 Monitoring Usage

Dashboard → Usage : Surveiller régulièrement.

**Coûts estimés** :
- Analyse (gpt-4o-mini) : ~$0.0001 / appel
- Développement idée : ~$0.0003 / appel
- 1000 users actifs/mois : ~$30-50/mois

---

## 5. Déploiement Vercel

### 5.1 Connecter Repo GitHub

1. Aller sur https://vercel.com/new
2. Import Git Repository
3. Sélectionner `manae-v2`
4. Configure Project :
   - **Framework Preset** : Next.js
   - **Root Directory** : `./`
   - **Build Command** : `npm run build`
   - **Output Directory** : `.next`

### 5.2 Variables d'Environnement

**Production** :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# OpenAI
OPENAI_API_KEY=sk-proj-xxx

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com

# App
NEXT_PUBLIC_APP_URL=https://my.manae.app
NODE_ENV=production
```

**Comment ajouter** :

1. Project Settings → Environment Variables
2. Ajouter chaque variable
3. Environment : **Production** (cocher)
4. Sauvegarder

### 5.3 Déployer

```bash
# Via CLI (optionnel)
npm install -g vercel
vercel --prod

# Ou via GitHub (automatique)
git push origin main
# Vercel déploie automatiquement
```

### 5.4 Vérifier Déploiement

1. Vercel → Deployments
2. Vérifier que le build est **Ready**
3. Cliquer "Visit" pour tester

---

## 6. Configuration Domaine

### 6.1 Ajouter Domaine Custom

1. Project Settings → Domains
2. Add Domain : `my.manae.app`
3. Vercel donne des DNS records à configurer

### 6.2 Configurer DNS

**Chez votre registrar** (ex: OVH, Gandi, Cloudflare) :

```
Type  Name  Value
----  ----  -----
A     my    76.76.21.21  (Vercel IP)
```

Ou :

```
Type   Name  Value
-----  ----  -----
CNAME  my    cname.vercel-dns.com
```

Attendre propagation DNS (~5-30 minutes).

### 6.3 Activer HTTPS

Vercel active automatiquement SSL (Let's Encrypt).

Vérifier : `https://my.manae.app` doit fonctionner.

---

## 7. Post-Déploiement

### 7.1 Tests Critiques

- [ ] **Homepage** : `https://my.manae.app` charge
- [ ] **Login** : Se connecter avec compte test
- [ ] **Capture** : Capturer une pensée
- [ ] **Analyse IA** : Vérifier que l'IA fonctionne
- [ ] **Google Calendar** : Connecter et planifier une tâche
- [ ] **Développement idée** : Développer une idée en projet
- [ ] **Courses** : Ajouter articles et planifier courses
- [ ] **Mobile** : Tester sur mobile (responsive)

### 7.2 Monitoring

**Activer Sentry** (recommandé) :

```bash
npm install @sentry/nextjs

# Initialiser
npx @sentry/wizard -i nextjs
```

**Configurer Analytics** :

- Amplitude, Mixpanel, ou Google Analytics
- Tracker events critiques :
  - `signup_completed`
  - `onboarding_completed`
  - `capture_submitted`
  - `task_scheduled`
  - `idea_developed`

### 7.3 Backups Supabase

1. Supabase Dashboard → Database → Backups
2. Activer **Daily backups** (plan payant)
3. Ou exporter manuellement chaque semaine :

```bash
supabase db dump -f backup.sql
```

---

## 8. Rollback Procedure

### 8.1 Rollback Vercel Deployment

**Si bug critique en prod** :

1. Vercel → Deployments
2. Trouver dernier déploiement stable
3. Cliquer "..." → **Promote to Production**
4. Confirmer

⏱ **Durée** : ~30 secondes

### 8.2 Rollback Database Migration

**Si migration casse la DB** :

```bash
# Restaurer backup
supabase db reset --db-url "postgresql://..."

# Ou appliquer migration de rollback
supabase migration new rollback_xxx
# Écrire SQL inverse de la migration problématique
supabase db push
```

---

## 9. Environnements Multiples

### 9.1 Setup Preview (Staging)

**Vercel** :
- Branches non-main → Preview deployments automatiques
- URL : `https://manae-v2-git-[branch]-[team].vercel.app`

**Supabase** :
- Créer projet `manae-staging`
- Variables d'env différentes pour Preview dans Vercel

### 9.2 Variables par Environnement

| Env | Supabase | OpenAI | Domain |
|-----|----------|--------|--------|
| **Dev** | Local ou projet dev | Clé dev | localhost:3000 |
| **Preview** | Staging project | Clé staging | preview.vercel.app |
| **Prod** | Production project | Clé prod | my.manae.app |

---

## 10. Checklist Pré-Déploiement

### Technique

- [ ] Toutes les migrations DB appliquées
- [ ] RLS policies activées sur toutes les tables
- [ ] Variables d'environnement prod configurées
- [ ] Google OAuth credentials prod créés
- [ ] OpenAI API key prod avec quotas
- [ ] Domaine DNS configuré
- [ ] Build local réussit (`npm run build`)
- [ ] Lint passe (`npm run lint`)

### Contenu

- [ ] Emails Supabase customisés
- [ ] Page `/login` fonctionnelle
- [ ] Page `/onboarding` complète
- [ ] Redirect `/` vers `/capture` ou `/clarte`
- [ ] Textes UI en français partout

### Sécurité

- [ ] `.env.local` dans `.gitignore`
- [ ] Pas de secrets hardcodés dans le code
- [ ] HTTPS activé (automatique Vercel)
- [ ] CORS configuré (si API externe)

### Monitoring

- [ ] Sentry configuré (erreurs)
- [ ] Analytics configuré (comportement)
- [ ] Logs Vercel accessibles
- [ ] Alerts OpenAI configurées

---

## 11. Commandes Utiles

### Vercel CLI

```bash
# Installer
npm install -g vercel

# Login
vercel login

# Lister déploiements
vercel list

# Logs production
vercel logs [deployment-url]

# Promouvoir un déploiement
vercel promote [deployment-url]

# Supprimer un déploiement
vercel remove [deployment-url]
```

### Supabase CLI

```bash
# Installer
npm install -g supabase

# Login
supabase login

# Link projet
supabase link --project-ref xxx

# Status migrations
supabase migration list

# Appliquer migrations
supabase db push

# Dump DB
supabase db dump -f backup.sql

# Reset DB (⚠️ destructif)
supabase db reset
```

---

## 12. Contacts Support

| Service | Support |
|---------|---------|
| **Vercel** | https://vercel.com/support |
| **Supabase** | https://supabase.com/support |
| **OpenAI** | https://help.openai.com |
| **Google Cloud** | https://cloud.google.com/support |

---

## 13. Troubleshooting Déploiement

### Build Fail sur Vercel

**Erreur** : `Error: Command "npm run build" exited with 1`

**Solutions** :
1. Vérifier build local : `npm run build`
2. Vérifier logs Vercel : cause exacte
3. Vérifier variables d'env présentes
4. Vérifier TypeScript errors : `npm run lint`

---

### Supabase Connection Error

**Erreur** : `Could not connect to Supabase`

**Solutions** :
1. Vérifier `NEXT_PUBLIC_SUPABASE_URL` correcte
2. Vérifier `NEXT_PUBLIC_SUPABASE_ANON_KEY` correcte
3. Vérifier Supabase project actif (pas paused)
4. Vérifier network depuis Vercel (pas de firewall)

---

### OpenAI Rate Limit

**Erreur** : `Rate limit exceeded`

**Solutions** :
1. Vérifier quota OpenAI Dashboard
2. Augmenter tier si nécessaire
3. Implémenter retry logic (déjà fait dans `/api/analyze-v2`)
4. Activer fallback règles basiques

---

### Google OAuth Error

**Erreur** : `redirect_uri_mismatch`

**Solutions** :
1. Vérifier redirect URI exact dans Google Cloud Console
2. Ajouter `https://my.manae.app/auth/google/callback`
3. Attendre ~5 minutes propagation Google

---

**Document créé le 22 janvier 2026**
