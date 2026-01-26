# 🚀 Guide d'Invitation Beta Users

> Procédure complète pour inviter et onboarder des beta testeurs sur Manae

---

## 1. Vue d'ensemble du flux

```
ADMIN                           BETA USER
  │                                │
  ├─ Ajoute email waitlist        │
  │  (table: waitlist)             │
  │                                │
  ├─ Envoie invitation email ──────►
  │  (via Supabase Auth)           │
  │                                │
  │                             ┌──┴──┐
  │                             │ Clique lien magic
  │                             │ (email)
  │                             └──┬──┘
  │                                │
  │                             /set-password
  │                             (définit password)
  │                                │
  │                             /onboarding
  │                             (4 étapes)
  │                                │
  │                             /capture
  │                             (app ready!)
  │                                │
```

---

## 2. Prérequis Technique

### 2.1 Configuration Supabase

**Variables d'environnement requises** :
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

**Tables nécessaires** :
- ✅ `waitlist` : Stocke emails en attente d'invitation
- ✅ `users` : Profils utilisateurs avec flags `password_set`, `onboarding_completed`
- ✅ `auth.users` : Table auth Supabase

**Policies RLS actives** :
- ✅ Waitlist accessible en écriture anonyme (pour inscription)
- ✅ Users accessible uniquement par owner

### 2.2 Configuration Email

**Supabase Auth** doit être configuré pour envoyer des emails :
1. Aller dans Supabase Dashboard → Authentication → Email Templates
2. Vérifier que **"Magic Link"** est activé
3. Customiser le template si besoin

---

## 3. Procédure d'Invitation

### 3.1 Étape 1 : Ajouter à la Waitlist

**Option A - Via Supabase Dashboard** :

1. Aller dans Supabase Dashboard → Table Editor → `waitlist`
2. Cliquer "Insert row"
3. Remplir :
   - `first_name` : Prénom du beta user
   - `last_name` : Nom
   - `email` : Email (doit être unique)
   - `created_at` : (auto)
   - `invited_at` : Laisser `null` pour l'instant
4. Cliquer "Save"

**Option B - Via SQL** :

```sql
INSERT INTO waitlist (first_name, last_name, email)
VALUES ('Marie', 'Dupont', 'marie.dupont@example.com');
```

**Option C - Via API (futur)** :

```typescript
// POST /api/admin/invite-beta
const response = await fetch('/api/admin/invite-beta', {
  method: 'POST',
  body: JSON.stringify({
    firstName: 'Marie',
    lastName: 'Dupont',
    email: 'marie.dupont@example.com'
  })
})
```

---

### 3.2 Étape 2 : Envoyer l'Invitation

**Option A : Via Script (Recommandé)**

```bash
# A. Inviter un email spécifique
npx tsx scripts/invite-beta-users.ts --email=user@example.com

# B. Inviter N personnes de la waitlist
npx tsx scripts/invite-beta-users.ts --limit=10

# C. Mode test (sans envoyer)
npx tsx scripts/invite-beta-users.ts --dry-run

# D. Exemple invitation spécifique
npx tsx scripts/invite-beta-users.ts --email=sandrine@example.com
```

**Option B : Via Supabase Dashboard (Manuel)**

1. Aller dans Authentication → Users
2. Cliquer "Invite user"
3. Saisir l'email du beta user
4. Supabase envoie automatiquement un **magic link** par email

**Important** : Le magic link :
- Est valide **24 heures**
- Auto-connecte l'utilisateur
- Redirige vers `/set-password`

**Mettre à jour la waitlist** :

```sql
UPDATE waitlist
SET invited_at = NOW()
WHERE email = 'marie.dupont@example.com';
```

---

### 3.3 Étape 3 : Suivi Invitation

**Vérifier que l'email est parti** :

1. Supabase Dashboard → Authentication → Users
2. Chercher l'email
3. Status doit être "Invited"

**Si l'email n'arrive pas** :
- Vérifier spam/courrier indésirable
- Vérifier que Supabase Auth est bien configuré
- Renvoyer l'invitation si besoin (bouton "Resend invitation")

---

## 4. Flux Utilisateur

### 4.1 Réception Email

Le beta user reçoit un email avec :
- **Objet** : "Invitation à rejoindre Manae"
- **Contenu** : Lien magic "Définir mon mot de passe"

**Template email** (à customiser dans Supabase) :

```
Bonjour {{ .FirstName }},

Bienvenue dans la beta de Manae ! 🎉

Clique sur le lien ci-dessous pour créer ton compte :

{{ .ConfirmationURL }}

Ce lien est valide 24 heures.

À bientôt,
L'équipe Manae
```

---

### 4.2 Page `/set-password`

**Déclenchement** : Après clic sur magic link.

**Fonction** :
- User définit son mot de passe
- Flag `users.password_set = true` est activé
- Redirect automatique vers `/onboarding`

**Middleware protection** :
- Si `password_set = false` → bloqué sur `/set-password`
- Si `password_set = true` → accès onboarding

---

### 4.3 Page `/onboarding`

**4 étapes obligatoires** :

| Étape | Page | Contenu |
|-------|------|---------|
| 1 | `/onboarding` | Saisie prénom/nom |
| 2 | `/onboarding/step2` | Sélection contextes (Perso, Famille, Travail) |
| 3 | `/onboarding/step3` | Sélection moments d'énergie (Matin, Après-midi, Soir) |
| 4 | `/onboarding/step4` | Connexion Google Calendar (optionnelle, skip possible) |

**Validation finale** :
- `users.onboarding_completed = true`
- Redirect `/capture`

**Middleware protection** :
- Si `onboarding_completed = false` → bloqué sur `/onboarding`
- Si `onboarding_completed = true` → accès app complète

---

### 4.4 Accès à l'App

Une fois onboarding terminé :
- ✅ Accès `/capture` (capture pensées)
- ✅ Accès `/clarte` (dashboard)
- ✅ Accès `/profil` (paramètres)
- ✅ Toutes fonctionnalités débloquées

---

## 5. Checklist Admin

### Avant Invitation

- [ ] Vérifier que Supabase Auth est configuré
- [ ] Vérifier que les templates email sont customisés
- [ ] Vérifier que les tables `waitlist` et `users` existent
- [ ] Tester le flow complet avec un email test

### Après Invitation

- [ ] Vérifier que l'email apparaît dans Authentication → Users
- [ ] Vérifier le status "Invited"
- [ ] Contacter le beta user pour confirmer réception email
- [ ] Aider en cas de problème (spam, lien expiré)

### Pendant Onboarding

- [ ] Suivre la progression (via logs ou dashboard)
- [ ] Vérifier que `password_set = true` après définition password
- [ ] Vérifier que `onboarding_completed = true` après étape 4

### Post-Onboarding

- [ ] Vérifier que le user peut accéder à `/capture`
- [ ] Lui envoyer le lien du guide utilisateur (si existant)
- [ ] Programmer un follow-up à J+3 pour feedback

---

## 6. Vérifications SQL

### 6.1 Lister tous les invités

```sql
SELECT
  w.first_name,
  w.last_name,
  w.email,
  w.invited_at,
  u.onboarding_completed,
  u.password_set
FROM waitlist w
LEFT JOIN users u ON w.email = u.email
ORDER BY w.invited_at DESC NULLS LAST;
```

### 6.2 Utilisateurs bloqués sur set-password

```sql
SELECT
  u.id,
  u.email,
  u.first_name,
  u.password_set,
  u.created_at
FROM users u
WHERE u.password_set = false;
```

### 6.3 Utilisateurs bloqués sur onboarding

```sql
SELECT
  u.id,
  u.email,
  u.first_name,
  u.onboarding_completed,
  u.password_set
FROM users u
WHERE u.password_set = true
  AND u.onboarding_completed = false;
```

### 6.4 Beta users actifs

```sql
SELECT
  u.id,
  u.email,
  u.first_name,
  u.onboarding_completed,
  u.created_at,
  (SELECT COUNT(*) FROM items WHERE user_id = u.id) as items_count
FROM users u
WHERE u.onboarding_completed = true
ORDER BY u.created_at DESC;
```

---

## 7. Troubleshooting

### Problème 1 : Email d'invitation non reçu

**Causes possibles** :
- Email dans spam/courrier indésirable
- Supabase Auth mal configuré
- Rate limit Supabase atteint

**Solutions** :
1. Demander au user de vérifier spam
2. Renvoyer l'invitation depuis Supabase Dashboard
3. Vérifier logs Supabase (Dashboard → Logs)

---

### Problème 2 : Lien magic expiré (24h)

**Solutions** :
1. Supabase Dashboard → Authentication → Users
2. Trouver l'utilisateur
3. Cliquer "Resend invitation"
4. Nouveau lien envoyé

---

### Problème 3 : User bloqué sur `/set-password`

**Diagnostic** :
```sql
SELECT password_set FROM users WHERE email = 'user@example.com';
-- Si FALSE → normal, attendre qu'il définisse le password
```

**Si vraiment bloqué** (erreur UI) :
1. Vérifier console navigateur (F12)
2. Vérifier logs Supabase
3. Forcer manuellement (dernier recours) :
```sql
UPDATE users
SET password_set = true
WHERE email = 'user@example.com';
```

---

### Problème 4 : User bloqué sur `/onboarding`

**Diagnostic** :
```sql
SELECT onboarding_completed FROM users WHERE email = 'user@example.com';
```

**Solutions** :
- Vérifier qu'il a bien validé les 4 étapes
- Si bug UI : forcer manuellement
```sql
UPDATE users
SET onboarding_completed = true
WHERE email = 'user@example.com';
```

---

### Problème 5 : Redirection infinie

**Symptômes** : Page recharge en boucle.

**Cause** : Middleware (`proxy.ts`) détecte un flag manquant.

**Solutions** :
1. Vérifier dans la console les redirects
2. Vérifier les valeurs :
```sql
SELECT
  email,
  password_set,
  onboarding_completed
FROM users
WHERE email = 'user@example.com';
```
3. Corriger les flags si nécessaire

---

## 8. Communication avec Beta Users

### 8.1 Email d'invitation personnalisé

**Objet** : "🎉 Bienvenue dans la beta Manae !"

**Corps** :
```
Bonjour [Prénom],

Tu fais partie des premiers testeurs de Manae ! 🚀

Manae est une app de productivité intelligente pour parents débordés,
avec capture vocale, IA et intégration Google Calendar.

→ Clique ici pour créer ton compte : [LIEN]

Pour démarrer rapidement, consulte notre guide en 3 minutes :
→ https://manae.app/guide-simple

Une fois connecté(e), n'hésite pas à tester toutes les fonctionnalités
et à me faire tes retours (bugs, idées, ce qui te plaît/déplaît).

Merci pour ton aide précieuse !

Sandrine
Fondatrice Manae
```

---

### 8.2 Email J+3 (suivi)

**Objet** : "Comment se passe ta beta Manae ?"

**Corps** :
```
Salut [Prénom],

Ça fait 3 jours que tu utilises Manae, j'aimerais avoir tes premiers retours !

Questions :
- As-tu réussi à capturer plusieurs pensées ?
- L'analyse IA est-elle pertinente ?
- As-tu connecté Google Calendar ?
- Rencontres-tu des bugs ?
- Qu'est-ce que tu aimes / n'aimes pas ?

Réponds-moi par email ou prends 15 min pour un appel rapide si tu préfères.

Merci encore !
Sandrine
```

---

## 9. Métriques à Suivre

### 9.1 Dashboard Beta

**KPIs** :
| Métrique | Requête SQL |
|----------|-------------|
| Invitations envoyées | `SELECT COUNT(*) FROM waitlist WHERE invited_at IS NOT NULL` |
| Comptes créés | `SELECT COUNT(*) FROM users` |
| Onboarding terminé | `SELECT COUNT(*) FROM users WHERE onboarding_completed = true` |
| Utilisateurs actifs J7 | `SELECT COUNT(DISTINCT user_id) FROM items WHERE created_at > NOW() - INTERVAL '7 days'` |
| Items capturés total | `SELECT COUNT(*) FROM items` |
| Google Calendar connecté | `SELECT COUNT(*) FROM users WHERE ...` (à implémenter) |

### 9.2 Entonnoir Conversion

```
100 invitations envoyées
 ├─ 85% cliquent lien (85)
 ├─ 70% définissent password (70)
 ├─ 60% terminent onboarding (60)
 └─ 40% actifs à J7 (40)
```

**Calcul taux abandon** :
```sql
WITH funnel AS (
  SELECT
    (SELECT COUNT(*) FROM waitlist WHERE invited_at IS NOT NULL) as invited,
    (SELECT COUNT(*) FROM users) as signed_up,
    (SELECT COUNT(*) FROM users WHERE password_set = true) as password_set,
    (SELECT COUNT(*) FROM users WHERE onboarding_completed = true) as onboarded
)
SELECT
  invited,
  signed_up,
  ROUND(100.0 * signed_up / invited, 1) as signup_rate,
  password_set,
  ROUND(100.0 * password_set / signed_up, 1) as password_rate,
  onboarded,
  ROUND(100.0 * onboarded / password_set, 1) as onboarding_rate
FROM funnel;
```

---

## 10. Checklist Pré-Lancement Beta

### Technique

- [ ] Environnement production Vercel déployé (my.manae.app)
- [ ] Supabase configuré avec domaine custom
- [ ] Variables d'environnement production setées
- [ ] Sentry activé (monitoring erreurs)
- [ ] Analytics activé (Amplitude, Mixpanel ou autre)
- [ ] Google Calendar OAuth credentials prod
- [ ] OpenAI API key prod avec quota suffisant

### Contenu

- [ ] Email templates Supabase customisés
- [ ] Email d'invitation rédigé
- [ ] Guide utilisateur prêt (si existant)
- [ ] FAQ beta testeurs
- [ ] Form feedback accessible

### Process

- [ ] Procédure invitation documentée (ce guide)
- [ ] Liste beta users priorisée (premiers 10-20)
- [ ] Calendrier follow-ups planifié (J+3, J+7, J+14)
- [ ] Channel support défini (email, Slack, WhatsApp ?)

---

## 11. Script Invitation Automatisé (Future)

**À implémenter** : API route pour automatiser.

```typescript
// app/api/admin/invite-beta/route.ts
export async function POST(request: NextRequest) {
  // 1. Vérifier auth admin
  // 2. Parser { firstName, lastName, email }
  // 3. Insert waitlist
  // 4. Supabase.auth.admin.inviteUserByEmail(email)
  // 5. Update waitlist.invited_at
  // 6. Envoyer email personnalisé (optionnel)
  // 7. Return success
}
```

**Usage** :
```bash
curl -X POST https://my.manae.app/api/admin/invite-beta \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Marie",
    "lastName": "Dupont",
    "email": "marie.dupont@example.com"
  }'
```

---

**Document créé le 22 janvier 2026**
