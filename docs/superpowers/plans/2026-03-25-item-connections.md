# Sprint 4 — Connexions entre items Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect thematic connections between user items daily and display one discrete suggestion in Clarté.

**Architecture:** Daily cron job calls GPT-4o-mini to find the most interesting thematic pair among active items, stores it in `daily_suggestions`, and a banner component in Clarté displays it dismissibly.

**Tech Stack:** Next.js 16 App Router, Supabase (PostgreSQL + RLS), OpenAI GPT-4o-mini, Vercel Cron, React 19, TypeScript

---

## Task 1 — Migration `010_daily_suggestions.sql`

**Files:**
- Create: `supabase/migrations/010_daily_suggestions.sql`

- [ ] Create the migration file:

```sql
-- Migration 010 : table daily_suggestions
-- Stocke une suggestion de connexion thématique par user par jour
-- Générée par le cron detect-connections (7h00 UTC)

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

- [ ] Apply in Supabase dashboard (SQL Editor) or via CLI:
  ```bash
  npx supabase db push
  ```
  Expected: migration applied, table `daily_suggestions` created with 8 columns.

- [ ] Commit:
  ```bash
  git add supabase/migrations/010_daily_suggestions.sql
  git commit -m "feat(db): add daily_suggestions table for item connections"
  ```

---

## Task 2 — Types `DailySuggestion` et `ItemForConnection`

**Files:**
- Modify: `types/index.ts`

- [ ] Append at the end of `types/index.ts`:

```typescript
// ============================================
// CONNEXIONS ENTRE ITEMS
// ============================================

/**
 * Suggestion de connexion thématique générée par l'IA (1 par jour max)
 */
export interface DailySuggestion {
  id: string
  user_id: string
  item_id_1: string
  item_id_2: string
  reason: string
  suggested_date: string  // "YYYY-MM-DD"
  dismissed: boolean
  created_at: string
}

/**
 * Représentation légère d'un item pour l'appel IA de détection
 */
export interface ItemForConnection {
  id: string
  content: string
}
```

- [ ] Run: `npm run lint` — Expected: no errors

- [ ] Commit:
  ```bash
  git add types/index.ts
  git commit -m "feat(types): add DailySuggestion and ItemForConnection interfaces"
  ```

---

## Task 3 — `services/connections.service.ts`

**Files:**
- Create: `services/connections.service.ts`

- [ ] Create the service file:

```typescript
/**
 * Service connexions — détecte les liens thématiques entre items
 * via GPT-4o-mini et stocke une suggestion par user par jour
 */

import OpenAI from 'openai'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DailySuggestion, ItemForConnection } from '@/types'

// ============================================
// CONFIGURATION
// ============================================

const ACTIVITY_THRESHOLD_ITEMS = 5
const ACTIVITY_THRESHOLD_DAYS = 7
const MAX_ITEMS_FOR_AI = 50

const CONNECTION_PROMPT = `Voici une liste d'items d'un utilisateur. Identifie la paire la plus
intéressante à rapprocher thématiquement. Retourne uniquement les deux
IDs et une phrase courte expliquant le lien en français.
Format JSON strict : { "item_id_1": "...", "item_id_2": "...", "reason": "..." }
Si aucun lien pertinent, retourne null.`

interface AIConnectionResponse {
  item_id_1: string
  item_id_2: string
  reason: string
}

// ============================================
// HELPERS PRIVÉS
// ============================================

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

function getDateDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

// ============================================
// FONCTIONS
// ============================================

/**
 * Détecte et enregistre une suggestion de connexion thématique pour un user.
 *
 * Conditions :
 * 1. ≥5 items actifs ET 1 capture dans les 7 derniers jours
 * 2. Pas de suggestion non-dismissée pour aujourd'hui
 * 3. L'IA trouve une paire pertinente
 */
async function detectConnectionForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const today = getTodayDateString()
  const sevenDaysAgo = getDateDaysAgo(ACTIVITY_THRESHOLD_DAYS)

  // 1. Vérifier seuil d'activité : ≥5 items actifs
  const { count: activeCount } = await supabase
    .from('items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('type', ['task', 'note', 'idea'])
    .in('state', ['active', 'planned', 'captured'])

  if (!activeCount || activeCount < ACTIVITY_THRESHOLD_ITEMS) {
    console.log(`[connections] ${userId}: seuil items insuffisant (${activeCount})`)
    return
  }

  // 2. Vérifier au moins 1 capture dans les 7 derniers jours
  const { count: recentCount } = await supabase
    .from('items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', sevenDaysAgo)

  if (!recentCount || recentCount === 0) {
    console.log(`[connections] ${userId}: aucune capture récente`)
    return
  }

  // 3. Vérifier absence de suggestion non-dismissée pour aujourd'hui
  const { data: existingSuggestion } = await supabase
    .from('daily_suggestions')
    .select('id')
    .eq('user_id', userId)
    .eq('suggested_date', today)
    .eq('dismissed', false)
    .maybeSingle()

  if (existingSuggestion) {
    console.log(`[connections] ${userId}: suggestion déjà existante pour aujourd'hui`)
    return
  }

  // 4. Fetch items actifs (max 50, champs id + content uniquement)
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('id, content')
    .eq('user_id', userId)
    .in('type', ['task', 'note', 'idea'])
    .in('state', ['active', 'planned', 'captured'])
    .limit(MAX_ITEMS_FOR_AI)

  if (itemsError || !items || items.length < 2) {
    console.log(`[connections] ${userId}: pas assez d'items pour l'IA`)
    return
  }

  // 5. Appel GPT-4o-mini
  if (!process.env.OPENAI_API_KEY) {
    console.error('[connections] OPENAI_API_KEY manquante')
    return
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const itemsList = (items as ItemForConnection[])
    .map(item => `- ID: ${item.id} | "${item.content}"`)
    .join('\n')

  let aiResult: AIConnectionResponse | null = null

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: `${CONNECTION_PROMPT}\n\n${itemsList}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 200
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) return

    const parsed = JSON.parse(raw)
    // json_object mode ne permet pas null littéral — on vérifie item_id_1
    if (!parsed?.item_id_1) {
      console.log(`[connections] ${userId}: aucun lien pertinent détecté par l'IA`)
      return
    }

    aiResult = parsed as AIConnectionResponse
  } catch (error) {
    console.error(`[connections] ${userId}: erreur appel IA`, error)
    return
  }

  // 6. Insérer dans daily_suggestions
  const { error: insertError } = await supabase
    .from('daily_suggestions')
    .insert({
      user_id: userId,
      item_id_1: aiResult.item_id_1,
      item_id_2: aiResult.item_id_2,
      reason: aiResult.reason,
      suggested_date: today
    })

  if (insertError) {
    // Code 23505 = violation UNIQUE(user_id, suggested_date) — race condition bénigne
    if (insertError.code === '23505') {
      console.log(`[connections] ${userId}: conflit UNIQUE ignoré`)
      return
    }
    console.error(`[connections] ${userId}: erreur insertion`, insertError)
  } else {
    console.log(`[connections] ${userId}: suggestion insérée pour ${today}`)
  }
}

/**
 * Récupère la suggestion du jour non-dismissée pour un user.
 */
async function getTodaySuggestion(
  supabase: SupabaseClient,
  userId: string
): Promise<DailySuggestion | null> {
  const today = getTodayDateString()

  const { data, error } = await supabase
    .from('daily_suggestions')
    .select('*')
    .eq('user_id', userId)
    .eq('suggested_date', today)
    .eq('dismissed', false)
    .maybeSingle()

  if (error) {
    console.error('[connections] Erreur récupération suggestion:', error)
    return null
  }

  return data as DailySuggestion | null
}

/**
 * Marque une suggestion comme dismissée.
 */
async function dismissSuggestion(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('daily_suggestions')
    .update({ dismissed: true })
    .eq('id', id)

  if (error) throw error
}

// ============================================
// SERVICE OBJECT
// ============================================

export const connectionsService = {
  detectConnectionForUser,
  getTodaySuggestion,
  dismissSuggestion
}
```

- [ ] Run: `npm run lint` — Expected: no errors

- [ ] Commit:
  ```bash
  git add services/connections.service.ts
  git commit -m "feat(service): add connections.service with daily suggestion detection"
  ```

---

## Task 4 — Cron `app/api/cron/detect-connections/route.ts` + `vercel.json`

**Files:**
- Create: `app/api/cron/detect-connections/route.ts`
- Modify: `vercel.json`

- [ ] Create the cron route (même pattern que `/api/cron/cleanup`):

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { connectionsService } from '@/services/connections.service'

/**
 * API Route: Détection quotidienne de connexions thématiques (Cron Job)
 *
 * Exécuté à 7h00 UTC via Vercel Cron.
 * Itère sur les users actifs dans les 7 derniers jours.
 *
 * Sécurité : Protégé par CRON_SECRET
 */

const ACTIVE_THRESHOLD_DAYS = 7

export async function GET(request: NextRequest) {
  try {
    // 1. Vérifier le secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret) {
        console.error('[cron/detect-connections] CRON_SECRET non configuré')
        return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 })
      }

      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error('[cron/detect-connections] Secret invalide')
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }
    }

    // 2. Créer client Supabase admin
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('[cron/detect-connections] Variables d\'environnement manquantes')
      return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // 3. Récupérer les users actifs dans les 7 derniers jours
    const thresholdDate = new Date()
    thresholdDate.setDate(thresholdDate.getDate() - ACTIVE_THRESHOLD_DAYS)

    const { data: allUsers, error: usersError } = await supabase.auth.admin.listUsers()

    if (usersError) {
      console.error('[cron/detect-connections] Erreur récupération users:', usersError)
      return NextResponse.json({ error: 'Erreur récupération users' }, { status: 500 })
    }

    const activeUsers = allUsers.users.filter(user => {
      const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null
      return lastSignIn && lastSignIn >= thresholdDate
    })

    console.log(`[cron/detect-connections] ${activeUsers.length} users actifs à traiter`)

    // 4. Traiter chaque user
    let processed = 0
    const errors: string[] = []

    for (const user of activeUsers) {
      try {
        await connectionsService.detectConnectionForUser(supabase, user.id)
        processed++
      } catch (err) {
        console.error(`[cron/detect-connections] Erreur user ${user.id}:`, err)
        errors.push(`Erreur user ${user.id}`)
      }
    }

    console.log(`[cron/detect-connections] Terminé: ${processed}/${activeUsers.length} traités`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: { usersProcessed: processed, usersTotal: activeUsers.length, errors }
    })

  } catch (error) {
    console.error('[cron/detect-connections] Erreur générale:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la détection de connexions' },
      { status: 500 }
    )
  }
}
```

- [ ] Update `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/detect-connections",
      "schedule": "0 7 * * *"
    }
  ]
}
```

- [ ] Run: `npm run lint` — Expected: no errors

- [ ] Commit:
  ```bash
  git add "app/api/cron/detect-connections/route.ts" vercel.json
  git commit -m "feat(cron): add detect-connections daily job at 7h UTC"
  ```

---

## Task 5 — `components/clarte/ConnectionSuggestion.tsx`

**Files:**
- Create: `components/clarte/ConnectionSuggestion.tsx`

- [ ] Create the component:

```tsx
'use client'

import { LinkIcon, X } from 'lucide-react'
import type { DailySuggestion } from '@/types'
import type { Item } from '@/types'

// ============================================
// HELPERS
// ============================================

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max) + '…'
}

// ============================================
// TYPES
// ============================================

interface ConnectionSuggestionProps {
  suggestion: DailySuggestion | null
  items: Item[]
  onDismiss: (id: string) => void
  onItemClick: (item: Item) => void
}

// ============================================
// COMPOSANT
// ============================================

/**
 * Bannière discrète affichant la connexion thématique du jour.
 * Rendu nul si aucune suggestion disponible.
 * Placée en haut de Clarté, au-dessus de tous les blocs.
 */
export function ConnectionSuggestion({
  suggestion,
  items,
  onDismiss,
  onItemClick
}: ConnectionSuggestionProps) {
  if (!suggestion) return null

  const item1 = items.find(i => i.id === suggestion.item_id_1) ?? null
  const item2 = items.find(i => i.id === suggestion.item_id_2) ?? null

  if (!item1 || !item2) return null

  return (
    <div className="bg-gray-50 border border-[var(--color-border)] rounded-xl p-4 space-y-3">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
          <LinkIcon className="w-4 h-4" />
          <span className="text-sm font-medium">On a remarqué un lien</span>
        </div>
        <button
          onClick={() => onDismiss(suggestion.id)}
          aria-label="Fermer la suggestion"
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Paire d'items */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onItemClick(item1)}
          className="text-sm font-medium text-[var(--color-text-primary)] bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:bg-gray-100 transition-colors text-left"
        >
          {truncate(item1.content, 30)}
        </button>
        <span className="text-[var(--color-text-muted)] text-sm">→</span>
        <button
          onClick={() => onItemClick(item2)}
          className="text-sm font-medium text-[var(--color-text-primary)] bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:bg-gray-100 transition-colors text-left"
        >
          {truncate(item2.content, 30)}
        </button>
      </div>

      {/* Raison */}
      <p className="text-sm text-[var(--color-text-muted)] italic">
        &ldquo;{suggestion.reason}&rdquo;
      </p>
    </div>
  )
}
```

- [ ] Run: `npm run lint` — Expected: no errors

- [ ] Commit:
  ```bash
  git add components/clarte/ConnectionSuggestion.tsx
  git commit -m "feat(ui): add ConnectionSuggestion banner component"
  ```

---

## Task 6 — Intégration dans `app/(main)/clarte/page.tsx`

**Files:**
- Modify: `app/(main)/clarte/page.tsx`

Read the file before modifying. The changes below describe exactly what to add/where.

### 6.1 — Imports à ajouter (en haut du fichier, avec les autres imports)

```typescript
import { ConnectionSuggestion } from '@/components/clarte/ConnectionSuggestion'
import { connectionsService } from '@/services/connections.service'
import { createClient } from '@/lib/supabase/client'
import type { DailySuggestion } from '@/types'
```

### 6.2 — État local (dans le composant, après les useState existants)

```typescript
const [todaySuggestion, setTodaySuggestion] = useState<DailySuggestion | null>(null)
```

### 6.3 — Chargement au montage (useEffect, après les effects existants)

```typescript
useEffect(() => {
  if (!user) return
  const supabase = createClient()
  connectionsService.getTodaySuggestion(supabase, user.id)
    .then(setTodaySuggestion)
    .catch(err => console.warn('[clarte] Erreur chargement suggestion:', err))
}, [user])
```

### 6.4 — Handler dismiss (après les handlers existants)

```typescript
const handleDismissSuggestion = useCallback(async (id: string) => {
  try {
    const supabase = createClient()
    await connectionsService.dismissSuggestion(supabase, id)
    setTodaySuggestion(null)
  } catch (error) {
    console.error('Erreur dismiss suggestion:', error)
  }
}, [])
```

### 6.5 — Handler clic sur un item de la suggestion (après handleDismissSuggestion)

Note: adapte selon les setters de modales disponibles dans la page (setSelectedTask, setSelectedNote, setSelectedIdea ou équivalents).

```typescript
const handleSuggestionItemClick = useCallback((item: Item) => {
  if (item.type === 'task') {
    setSelectedTask(item)
  } else if (item.type === 'note') {
    setSelectedNote(item)
  } else if (item.type === 'idea') {
    setSelectedIdea(item)
  }
}, [])
```

### 6.6 — `allItems` pour le composant (useMemo, après les useMemo existants)

```typescript
const allItems = useMemo(
  () => [...(tasks ?? []), ...(notes ?? []), ...(ideas ?? [])],
  [tasks, notes, ideas]
)
```

Note: adapte les noms de variables selon ce qui est disponible dans le composant (issues de `useClarteData` ou équivalent).

### 6.7 — Placement dans le JSX

Dans la `<div className="space-y-4 ...">` qui contient les blocs, ajouter en premier enfant :

```tsx
<ConnectionSuggestion
  suggestion={todaySuggestion}
  items={allItems}
  onDismiss={handleDismissSuggestion}
  onItemClick={handleSuggestionItemClick}
/>
```

`ConnectionSuggestion` retourne `null` si `suggestion` est `null` — pas besoin de conditionnel.

- [ ] Run: `npm run lint && npm run build` — Expected: no errors

- [ ] Commit:
  ```bash
  git add "app/(main)/clarte/page.tsx"
  git commit -m "feat(clarte): integrate daily connection suggestion banner"
  ```

---

## Vérification finale

- [ ] `npm run lint` — no errors
- [ ] `npm run build` — no errors
- [ ] Test manuel en dev:
  - Se connecter avec un user ayant ≥5 items actifs
  - Appeler `GET /api/cron/detect-connections` (pas de vérification auth en dev)
  - Recharger Clarté → la bannière s'affiche
  - Cliquer un item → la bonne modale s'ouvre
  - Cliquer X → la bannière disparaît et reste absente au rechargement
  - Rappeler le cron → pas de doublon
- [ ] Appliquer la migration `010_daily_suggestions.sql` en production (Supabase Dashboard > SQL Editor)
