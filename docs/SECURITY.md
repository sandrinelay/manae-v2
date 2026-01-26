# 🔒 Sécurité & RGPD

> Documentation sécurité et conformité RGPD pour Manae

---

## 1. Vue d'ensemble Sécurité

### 1.1 Principes Fondamentaux

| Principe | Implémentation |
|----------|----------------|
| **Authentication** | Supabase Auth (JWT + RLS) |
| **Authorization** | Row Level Security (RLS) policies |
| **Data encryption** | HTTPS + PostgreSQL encryption at rest |
| **Secrets management** | Variables d'environnement (Vercel) |
| **API security** | Auth check sur toutes les routes |

### 1.2 Threat Model

**Assets critiques** :
- 🔐 Données utilisateurs (items, profils)
- 🔑 Tokens Google Calendar
- 💳 Informations paiement (Stripe - futur)
- 🤖 API keys (OpenAI, Supabase)

**Menaces** :
- ⚠️ Accès non autorisé aux données
- ⚠️ Injection SQL
- ⚠️ XSS (Cross-Site Scripting)
- ⚠️ CSRF (Cross-Site Request Forgery)
- ⚠️ Fuite de secrets

---

## 2. Authentification

### 2.1 Supabase Auth

**Méthodes supportées** :
- ✅ Email + Password
- ✅ Magic Link (invitation)
- ✅ OAuth Google

**Sécurité** :
- Mots de passe hashés (bcrypt)
- Sessions JWT avec expiration (1h)
- Refresh tokens sécurisés (cookie httpOnly)
- Rate limiting sur login (Supabase)

### 2.2 Middleware Auth (`proxy.ts`)

**Fonction** : Vérifie auth sur chaque requête.

```typescript
// Refresh session automatique
const { data: { user } } = await supabase.auth.getUser()

// Redirect si non auth
if (!user && !isPublicRoute) {
  return NextResponse.redirect('/login')
}
```

**Routes publiques** :
- `/login`, `/signup`, `/forgot-password`
- `/api/*` (vérif interne à chaque route)
- `/auth/google/callback`

### 2.3 API Routes Protection

**Pattern obligatoire** :

```typescript
export async function POST(request: NextRequest) {
  // 1. Vérifier auth
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Continue...
}
```

---

## 3. Row Level Security (RLS)

### 3.1 Principe

Chaque table a des **policies RLS** qui filtrent automatiquement selon `auth.uid()`.

**Avantage** : Impossible d'accéder aux données d'un autre user, même avec requête SQL malveillante.

### 3.2 Policies Standard

**Table `items`** :

```sql
-- Lecture : propres items uniquement
CREATE POLICY "Users can view own items" ON items
  FOR SELECT USING (auth.uid() = user_id);

-- Insertion : user_id doit matcher auth
CREATE POLICY "Users can insert own items" ON items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Mise à jour : propres items
CREATE POLICY "Users can update own items" ON items
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Suppression : propres items
CREATE POLICY "Users can delete own items" ON items
  FOR DELETE USING (auth.uid() = user_id);
```

**Résultat** : User ne peut **JAMAIS** voir/modifier les items d'un autre user.

### 3.3 Vérification Policies

```sql
-- Lister toutes les policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Vérifier RLS activé partout
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
-- Doit retourner 0 lignes
```

---

## 4. Gestion des Secrets

### 4.1 Variables d'Environnement

**❌ JAMAIS dans le code** :

```typescript
// ❌ INTERDIT
const apiKey = "sk-proj-abc123..."

// ✅ CORRECT
const apiKey = process.env.OPENAI_API_KEY
```

### 4.2 Fichiers à NE JAMAIS Committer

**`.gitignore` contient** :

```
.env
.env.local
.env.*.local
.vercel
```

**Vérification** :

```bash
# Vérifier qu'aucun secret n'est tracké
git grep -i "sk-proj-" || echo "OK"
git grep -i "supabase_anon_key" || echo "OK"
```

### 4.3 Rotation des Secrets

**Fréquence recommandée** :
- OpenAI API key : Tous les 6 mois
- Supabase service_role : Tous les 6 mois
- Google OAuth secret : Annuel
- Passwords admin : Annuel

**Procédure** :
1. Générer nouveau secret
2. Ajouter dans Vercel (sans supprimer ancien)
3. Déployer
4. Vérifier prod fonctionne
5. Supprimer ancien secret

---

## 5. Protection Données

### 5.1 HTTPS Obligatoire

- ✅ Vercel force HTTPS automatiquement
- ✅ Redirect HTTP → HTTPS
- ✅ HSTS header activé

**Vérification** :

```bash
curl -I http://my.manae.app
# Doit retourner 308 Permanent Redirect vers https://
```

### 5.2 Encryption at Rest

- ✅ Supabase PostgreSQL : Encryption at rest activée (AES-256)
- ✅ Vercel : Disque chiffré

### 5.3 Tokens Google Calendar

**Stockage** : `localStorage` côté client.

**⚠️ Risque** : XSS peut voler tokens.

**Mitigations** :
1. CSP (Content Security Policy) strict
2. Refresh tokens avec expiration courte
3. Validation input partout (pas de `dangerouslySetInnerHTML`)

**Amélioration future** : Stocker tokens côté serveur (table sécurisée).

---

## 6. Prévention Vulnérabilités

### 6.1 SQL Injection

**Protection** : Supabase client utilise prepared statements automatiquement.

```typescript
// ✅ SAFE : paramétrisé
const { data } = await supabase
  .from('items')
  .select('*')
  .eq('user_id', userId)

// ❌ UNSAFE (n'existe pas dans Supabase, heureusement)
const query = `SELECT * FROM items WHERE user_id = '${userId}'`
```

### 6.2 XSS (Cross-Site Scripting)

**Protection** : React échappe automatiquement les variables.

```tsx
// ✅ SAFE : échappé par React
<div>{item.content}</div>

// ❌ UNSAFE : pas d'échappement
<div dangerouslySetInnerHTML={{ __html: item.content }} />
// ⚠️ N'utiliser QUE si HTML trusted et sanitisé
```

**Sanitization** : Si besoin d'injecter HTML (rare), utiliser `DOMPurify`.

### 6.3 CSRF (Cross-Site Request Forgery)

**Protection** : Cookies `SameSite=Lax` (Supabase par défaut).

**Vérification** :

```typescript
// Supabase cookies sont déjà protégés
// Pas besoin de CSRF token supplémentaire
```

### 6.4 Rate Limiting

**Supabase** : Rate limit natif sur auth (5 tentatives / 5 min).

**API Routes** : À implémenter si nécessaire.

**Recommandation** : Upstash Rate Limit ou Vercel Edge Middleware.

```typescript
// Exemple (à implémenter)
import { Ratelimit } from "@upstash/ratelimit"

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
})

export async function POST(request: NextRequest) {
  const ip = request.ip ?? "127.0.0.1"
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return new Response("Too Many Requests", { status: 429 })
  }

  // Continue...
}
```

---

## 7. RGPD & Confidentialité

### 7.1 Données Personnelles Collectées

| Donnée | Finalité | Base légale |
|--------|----------|-------------|
| Email | Authentification, contact | Contrat |
| Prénom, Nom | Personnalisation | Contrat |
| Pensées capturées | Service (analyse IA) | Contrat |
| Mood | Planification intelligente | Contrat |
| Tokens Google | Intégration calendrier | Consentement |
| Logs d'usage | Amélioration produit | Intérêt légitime |

### 7.2 Droits Utilisateurs

**Droits RGPD** :
- ✅ **Accès** : User peut voir toutes ses données (via profil)
- ✅ **Rectification** : User peut modifier ses données (via profil)
- ✅ **Effacement** : User peut supprimer son compte
- ✅ **Portabilité** : Export JSON (à implémenter)
- ✅ **Opposition** : User peut refuser analytics (à implémenter)

**Procédure suppression compte** :

```sql
-- À implémenter via API /api/account/delete
BEGIN;

-- 1. Supprimer items
DELETE FROM items WHERE user_id = $1;

-- 2. Supprimer contraintes
DELETE FROM constraints WHERE user_id = $1;

-- 3. Supprimer profil
DELETE FROM users WHERE id = $1;

-- 4. Supprimer auth
-- (via Supabase Admin API)

COMMIT;
```

### 7.3 Durée de Conservation

| Donnée | Durée |
|--------|-------|
| Items actifs | Illimité (tant que compte actif) |
| Items archivés | 1 an puis suppression auto (à implémenter) |
| Logs d'usage | 90 jours |
| Compte inactif | 2 ans puis suppression (à implémenter) |

### 7.4 Sous-Traitants

| Service | Rôle | Localisation | DPA |
|---------|------|--------------|-----|
| **Supabase** | Hébergement BDD | EU (Frankfurt) | ✅ Oui |
| **Vercel** | Hébergement app | US + EU | ✅ Oui |
| **OpenAI** | Analyse IA | US | ✅ Oui |
| **Google** | Calendrier | US + EU | ✅ Oui |

**DPA** : Data Processing Agreement (accord sous-traitance RGPD).

### 7.5 Transferts Hors UE

- **OpenAI** : US → Clauses contractuelles types (CCT)
- **Google** : US → Clauses contractuelles types (CCT)
- **Vercel** : Edge Network EU privilégié

---

## 8. Documents Légaux

### 8.1 Politique de Confidentialité

**Obligatoire RGPD**. Doit contenir :

1. Identité responsable traitement (toi)
2. Données collectées et finalités
3. Base légale chaque traitement
4. Durée de conservation
5. Droits utilisateurs (accès, rectification, effacement...)
6. Contact DPO (si applicable) ou email
7. Droit réclamation CNIL

**Exemple structure** :

```markdown
# Politique de Confidentialité

## 1. Responsable du traitement
Manae, représentée par Sandrine Lay
Email : [email]

## 2. Données collectées
- Email, prénom, nom : authentification
- Pensées capturées : service analyse IA
- ...

## 3. Finalités
...

## 4. Base légale
...

## 5. Durée de conservation
...

## 6. Vos droits
Vous disposez d'un droit d'accès, de rectification, d'effacement...
Contact : [email]

## 7. Réclamation
Vous pouvez introduire une réclamation auprès de la CNIL.
```

**Accès** : Lien footer + lors inscription.

### 8.2 CGU (Conditions Générales d'Utilisation)

**Obligatoire**. Doit contenir :

1. Objet du service
2. Conditions d'accès
3. Propriété intellectuelle
4. Responsabilités
5. Résiliation
6. Loi applicable

### 8.3 Mentions Légales

**Obligatoire** :
- Raison sociale / nom
- Adresse siège social
- Email contact
- Directeur publication
- Hébergeur (Vercel)

---

## 9. Consentements

### 9.1 Cookies

**Situation actuelle** :
- Supabase auth : Cookie technique (pas de consentement requis)
- Pas d'analytics cookies pour l'instant

**Si analytics ajouté** :
- Banner cookie obligatoire
- Opt-in explicite (pas de pré-coché)
- Refus doit être aussi simple qu'acceptation

### 9.2 Google Calendar

**Consentement explicite** lors onboarding :

```tsx
<div>
  <h3>Connecter Google Calendar</h3>
  <p>
    En cliquant "Connecter", vous autorisez Manae à :
    - Lire vos événements calendrier
    - Créer des événements pour vos tâches
  </p>
  <button>Connecter</button>
  <button>Passer cette étape</button>
</div>
```

---

## 10. Audit Sécurité

### 10.1 Checklist Sécurité

**Authentification** :
- [ ] Mots de passe hashés (bcrypt via Supabase)
- [ ] Sessions JWT avec expiration
- [ ] Refresh tokens sécurisés
- [ ] Rate limiting sur login

**Autorisation** :
- [ ] RLS activé sur toutes les tables
- [ ] Policies testées (user ne voit que ses données)
- [ ] Auth check sur toutes les API routes

**Données** :
- [ ] HTTPS obligatoire (Vercel)
- [ ] Encryption at rest (Supabase)
- [ ] Secrets dans variables d'env (jamais hardcodés)
- [ ] `.env.local` dans `.gitignore`

**Vulnérabilités** :
- [ ] SQL injection : impossible (Supabase client)
- [ ] XSS : échappement React automatique
- [ ] CSRF : cookies SameSite (Supabase)

**RGPD** :
- [ ] Politique de confidentialité publiée
- [ ] CGU publiées
- [ ] Mentions légales publiées
- [ ] Consentement Google Calendar explicite
- [ ] Procédure suppression compte implémentée (à faire)
- [ ] Export données implémenté (à faire)

### 10.2 Tests de Pénétration

**À faire** (avant lancement public) :
1. Test injection SQL (normalement impossible)
2. Test XSS sur tous les inputs
3. Test accès données autres users (RLS)
4. Test secrets exposés (scan code)
5. Test rate limiting

**Tools** :
- OWASP ZAP
- Burp Suite Community
- `npm audit` (vulnérabilités dépendances)

### 10.3 Monitoring

**Sentry** : Alertes erreurs + performance.

**Logs Vercel** : Surveiller patterns suspects.

**Supabase Logs** : Surveiller requêtes DB anormales.

---

## 11. Incident Response

### 11.1 Procédure en Cas de Fuite

**Étapes** :

1. **Contenir** : Changer immédiatement les secrets compromis
2. **Évaluer** : Quelles données ? Combien d'users ?
3. **Notifier** : CNIL (72h) + users concernés
4. **Corriger** : Patcher vulnérabilité
5. **Post-mortem** : Documenter + améliorer

### 11.2 Notification CNIL

**Obligatoire** si :
- Risque pour droits/libertés des personnes
- Délai : **72 heures** max

**Contact CNIL** : https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles

### 11.3 Notification Users

**Obligatoire** si :
- Risque élevé pour les personnes

**Template email** :

```
Objet : Incident de sécurité - Action requise

Bonjour,

Nous vous informons d'un incident de sécurité survenu le [date].

Nature : [description]
Données concernées : [quelles données]
Actions entreprises : [corrections]

Actions recommandées :
- Changer votre mot de passe
- ...

Nous sommes désolés pour cet incident.
Contact : [email]
```

---

## 12. Checklist Pré-Lancement

### Sécurité Technique

- [ ] RLS policies déployées et testées
- [ ] Auth middleware fonctionnel
- [ ] Secrets en variables d'env (Vercel)
- [ ] HTTPS activé
- [ ] Headers sécurité (CSP, HSTS) configurés
- [ ] Rate limiting sur endpoints critiques
- [ ] Scan vulnérabilités dépendances : `npm audit`

### RGPD & Légal

- [ ] Politique de confidentialité rédigée et publiée
- [ ] CGU rédigées et publiées
- [ ] Mentions légales publiées
- [ ] Consentements explicites (Google Calendar)
- [ ] Procédure suppression compte prête
- [ ] Registre traitements RGPD (si > 250 employés ou sensible)

### Monitoring

- [ ] Sentry configuré (erreurs)
- [ ] Logs centralisés (Vercel + Supabase)
- [ ] Alertes critiques configurées
- [ ] Procédure incident documentée

---

## 13. Contacts

| Sujet | Contact |
|-------|---------|
| **Sécurité** | security@manae.app (à créer) |
| **RGPD** | dpo@manae.app ou email principal |
| **CNIL** | https://www.cnil.fr |

---

**Document créé le 22 janvier 2026**
