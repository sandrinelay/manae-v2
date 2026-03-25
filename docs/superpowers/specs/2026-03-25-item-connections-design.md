# Connexions entre items — Design Spec

**Date:** 2026-03-25
**Sprint:** 4 — SAN-10, SAN-18, SAN-19
**Status:** Approved

---

## Contexte

Détecter automatiquement des liens thématiques entre les items d'un utilisateur et lui suggérer discrètement une connexion par jour dans Clarté.

---

## Décisions clés

- **Type de connexion** : thème commun uniquement (A) — pas de séquence logique ni regroupement projet pour l'instant
- **Déclenchement** : cron quotidien (pas post-capture) — économique, aligné sur la cadence "1 suggestion/jour"
- **Seuil d'activité** : ≥5 items actifs ET 1 capture dans les 7 derniers jours — évite les appels OpenAI inutiles pour les users inactifs
- **Stockage** : table `daily_suggestions` légère avec UNIQUE(user_id, suggested_date)
- **Affichage** : bannière discrète en haut de Clarté, items cliquables (ouvre la modale de détail existante selon le type)

---

## Modèle de données

### Table `daily_suggestions` (nouvelle)

```sql
CREATE TABLE daily_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  item_id_1 UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  item_id_2 UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  suggested_date DATE NOT NULL,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, suggested_date)
);

ALTER TABLE daily_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own suggestions"
  ON daily_suggestions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## Architecture

### Nouveaux fichiers

```
supabase/migrations/010_daily_suggestions.sql
services/connections.service.ts
app/api/cron/detect-connections/route.ts
components/clarte/ConnectionSuggestion.tsx
```

### Fichiers modifiés

```
app/(main)/clarte/page.tsx   — intégration ConnectionSuggestion
vercel.json                  — ajout du cron quotidien
```

---

## Service `connections.service.ts`

```typescript
export const connectionsService = {
  detectConnectionForUser(supabase, userId): Promise<void>
  getTodaySuggestion(supabase, userId): Promise<DailySuggestion | null>
  dismissSuggestion(supabase, id): Promise<void>
}
```

**`detectConnectionForUser` :**
1. Vérifier seuil d'activité (≥5 items actifs + capture < 7j) → return si non rempli
2. Vérifier absence de suggestion non-dismissée pour aujourd'hui → return si existe
3. Fetch items actifs (task + note + idea, max 50, champs : id + content)
4. Appel GPT-4o-mini avec prompt de détection thématique
5. Insérer dans `daily_suggestions`

**Prompt GPT :**
```
Voici une liste d'items d'un utilisateur. Identifie la paire la plus
intéressante à rapprocher thématiquement. Retourne uniquement les deux
IDs et une phrase courte expliquant le lien en français.
Format JSON strict : { "item_id_1": "...", "item_id_2": "...", "reason": "..." }
Si aucun lien pertinent, retourne null.
```

---

## Cron `app/api/cron/detect-connections/route.ts`

Même pattern que `/api/cron/cleanup` :
- Protégé par header `Authorization: Bearer CRON_SECRET`
- Itère sur tous les users actifs (last_sign_in < 7 jours)
- Appelle `detectConnectionForUser()` pour chacun
- Déclenché à 7h00 UTC via `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/detect-connections", "schedule": "0 7 * * *" }
  ]
}
```

---

## Composant `ConnectionSuggestion.tsx`

Carte discrète affichée en haut de Clarté, au-dessus de tous les blocs.

**Rendu conditionnel** : uniquement si `suggestion !== null`

**Structure visuelle :**
```
┌─────────────────────────────────────────────┐
│ 🔗  On a remarqué un lien                  ✕ │
│                                               │
│  [Titre item 1]  →  [Titre item 2]           │
│  "Ces deux items parlent tous les deux de…"  │
└─────────────────────────────────────────────┘
```

**Interactions :**
- Clic ✕ → `dismissSuggestion()` → composant disparaît
- Clic item → ouvre la modale de détail selon le type :
  - `task` → `TaskActiveModal`
  - `note` → `NoteDetailModal`
  - `idea` → `IdeaDetailModal`

**Style** : fond `bg-gray-50`, bordure `border-[var(--color-border)]`, icône de lien Lucide (`LinkIcon`), texte `reason` en `text-sm text-[var(--color-text-muted)]`

---

## Ce qui n'est PAS dans le scope

- Connexions de type séquence logique (B) ou regroupement projet (C)
- Historique des suggestions passées
- Possibilité de "valider" une connexion (créer un lien permanent)
- Notification push ou email
- Plusieurs suggestions par jour
