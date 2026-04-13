# Sprint 6 — Listes d'achats multiples Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la liste de courses unique par 5 listes d'achats distinctes (Alimentaire, Maison, Enfants, Pro, En ligne), avec choix à l'onboarding, toggle dans le profil, et détection automatique par l'IA.

**Architecture:** Nouvelle table `lists` remplace `shopping_lists` (supprimée). `items.list_id` migre sa FK. UI mise à jour avec onglets dans `ShoppingFullView`, résumé par liste dans `ShoppingBlock`, "Déplacer vers…" dans `ShoppingItemModal`, et `PlanShoppingModal` par liste. Nouvel onboarding step4 (choix des listes) ajouté avant `/capture`. Section "Mes listes" dans le profil.

**Tech Stack:** Next.js 16, Supabase PostgreSQL + RLS, TypeScript, Tailwind CSS 4, OpenAI (prompt)

**Spec:** `docs/superpowers/specs/2026-03-17-sprint6-listes-achats-design.md`

---

## Fichiers

| Action | Fichier | Rôle |
|--------|---------|------|
| Créer | `supabase/migrations/007_lists.sql` | Table lists, migration FK, suppression shopping_lists |
| Créer | `types/lists.ts` | Types List, ListSlug, constantes |
| Créer | `services/lists.service.ts` | getLists, getItemsByList, getListsWithCounts, getListBySlug |
| Modifier | `hooks/useClarteData.ts` | Remplacer shoppingItems par listsWithCounts |
| Modifier | `components/clarte/blocks/ShoppingBlock.tsx` | Affichage résumé par liste |
| Modifier | `components/clarte/views/ShoppingFullView.tsx` | Onglets 5 listes + déplacement |
| Modifier | `components/clarte/modals/ShoppingItemModal.tsx` | Ajouter "Déplacer vers…" |
| Modifier | `components/clarte/modals/PlanShoppingModal.tsx` | Planification par liste |
| Créer | `app/onboarding/step4/page.tsx` | Choix des listes activées |
| Modifier | `app/onboarding/step3/page.tsx` | Rediriger vers step4 au lieu de /capture |
| Modifier | `app/(main)/profil/page.tsx` | Section "Mes listes d'achats" avec toggles |
| Modifier | `prompts/analyze.ts` | Ajouter list_slug + règles détection |
| Modifier | `app/api/analyze-v2/route.ts` | Résoudre list_slug → list_id |

---

## Chunk 1 : Base de données + Types + Service

### Task 1 : Migration Supabase

**Files:**
- Créer : `supabase/migrations/007_lists.sql`

- [ ] **Step 1 : Créer `supabase/migrations/007_lists.sql`**

```sql
-- ============================================
-- Table lists : remplace shopping_lists
-- ============================================

CREATE TABLE IF NOT EXISTS lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  position int NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, slug)
);

ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_lists"   ON lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_lists" ON lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_lists" ON lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_lists" ON lists FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Seed : 5 listes par utilisateur
-- ============================================

CREATE OR REPLACE FUNCTION create_default_lists(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO lists (user_id, name, slug, position) VALUES
    (p_user_id, 'Alimentaire', 'alimentaire', 1),
    (p_user_id, 'Maison',      'maison',      2),
    (p_user_id, 'Enfants',     'enfants',     3),
    (p_user_id, 'Pro',         'pro',         4),
    (p_user_id, 'En ligne',    'en-ligne',    5)
  ON CONFLICT (user_id, slug) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION handle_new_user_lists()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM create_default_lists(new.id);
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_lists ON auth.users;
CREATE TRIGGER on_auth_user_created_lists
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user_lists();

-- Créer les listes pour les utilisateurs existants
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM auth.users LOOP
    PERFORM create_default_lists(r.id);
  END LOOP;
END;
$$;

-- ============================================
-- Migration items.list_id : shopping_lists → lists
-- ============================================

-- 1. Supprimer l'ancienne FK
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_list_id_fkey;

-- 2. Ajouter la nouvelle FK vers lists
ALTER TABLE items
  ADD CONSTRAINT items_list_id_fkey
  FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE SET NULL;

-- 3. Migrer les list_item existants vers liste "alimentaire"
UPDATE items
SET list_id = l.id
FROM lists l
WHERE items.type = 'list_item'
  AND l.user_id = items.user_id
  AND l.slug = 'alimentaire';

-- 4. Supprimer l'ancienne table
DROP TABLE IF EXISTS shopping_lists CASCADE;
```

- [ ] **Step 2 : Appliquer la migration**

```bash
cd /Users/sandrinelay/Projets/manae-v2
npx supabase db push
```

Expected : migration appliquée sans erreur. Vérifier dans le dashboard Supabase que la table `lists` existe avec 5 lignes par utilisateur et que `shopping_lists` est supprimée.

- [ ] **Step 3 : Commit**

```bash
git add supabase/migrations/007_lists.sql
git commit -m "feat(lists): add lists table, migrate from shopping_lists, update FK"
```

---

### Task 2 : Types + Service

**Files:**
- Créer : `types/lists.ts`
- Créer : `services/lists.service.ts`

- [ ] **Step 1 : Créer `types/lists.ts`**

```typescript
export interface List {
  id: string
  user_id: string
  name: string
  slug: ListSlug
  position: number
  enabled: boolean
  created_at: string
}

export type ListSlug = 'alimentaire' | 'maison' | 'enfants' | 'pro' | 'en-ligne'

export const LIST_SLUGS: ListSlug[] = ['alimentaire', 'maison', 'enfants', 'pro', 'en-ligne']

export const LIST_NAMES: Record<ListSlug, string> = {
  'alimentaire': 'Alimentaire',
  'maison':      'Maison',
  'enfants':     'Enfants',
  'pro':         'Pro',
  'en-ligne':    'En ligne',
}
```

- [ ] **Step 2 : Créer `services/lists.service.ts`**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { List, ListSlug } from '@/types/lists'
import type { Item } from '@/types/items'

export async function getLists(supabase: SupabaseClient, userId: string): Promise<List[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', userId)
    .eq('enabled', true)
    .order('position', { ascending: true })

  if (error) {
    console.warn('[lists] getLists failed:', error.message)
    return []
  }
  return data || []
}

export async function getAllLists(supabase: SupabaseClient, userId: string): Promise<List[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })

  if (error) {
    console.warn('[lists] getAllLists failed:', error.message)
    return []
  }
  return data || []
}

export async function getItemsByList(
  supabase: SupabaseClient,
  userId: string,
  listId: string
): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'list_item')
    .eq('list_id', listId)
    .in('state', ['active', 'completed'])
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('[lists] getItemsByList failed:', error.message)
    return []
  }
  return data || []
}

export async function getListsWithCounts(
  supabase: SupabaseClient,
  userId: string
): Promise<Array<List & { activeCount: number }>> {
  const lists = await getLists(supabase, userId)
  if (lists.length === 0) return []

  const { data: items } = await supabase
    .from('items')
    .select('list_id')
    .eq('user_id', userId)
    .eq('type', 'list_item')
    .eq('state', 'active')

  const countByList: Record<string, number> = {}
  for (const item of items || []) {
    if (item.list_id) {
      countByList[item.list_id] = (countByList[item.list_id] || 0) + 1
    }
  }

  return lists.map(list => ({
    ...list,
    activeCount: countByList[list.id] || 0,
  }))
}

export async function getListBySlug(
  supabase: SupabaseClient,
  userId: string,
  slug: ListSlug
): Promise<List | null> {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', userId)
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.warn('[lists] getListBySlug failed:', error.message)
    return null
  }
  return data
}

export async function updateListEnabled(
  supabase: SupabaseClient,
  listId: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from('lists')
    .update({ enabled })
    .eq('id', listId)

  if (error) {
    throw new Error(`[lists] updateListEnabled failed: ${error.message}`)
  }
}

export async function moveItemToList(
  supabase: SupabaseClient,
  itemId: string,
  listId: string
): Promise<void> {
  const { error } = await supabase
    .from('items')
    .update({ list_id: listId, updated_at: new Date().toISOString() })
    .eq('id', itemId)

  if (error) {
    throw new Error(`[lists] moveItemToList failed: ${error.message}`)
  }
}
```

- [ ] **Step 3 : Vérifier la compilation**

```bash
cd /Users/sandrinelay/Projets/manae-v2 && npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected : aucune erreur TypeScript sur les nouveaux fichiers.

- [ ] **Step 4 : Commit**

```bash
git add types/lists.ts services/lists.service.ts
git commit -m "feat(lists): add List type and lists.service"
```

---

## Chunk 2 : UI — Clarté

### Task 3 : Mettre à jour useClarteData

**Files:**
- Modifier : `hooks/useClarteData.ts`

- [ ] **Step 1 : Lire `hooks/useClarteData.ts` en entier**

```bash
cat /Users/sandrinelay/Projets/manae-v2/hooks/useClarteData.ts
```

- [ ] **Step 2 : Remplacer `shoppingItems` par `listsWithCounts` dans le type `ClarteData`**

Trouver dans `useClarteData.ts` :
```typescript
interface ClarteData {
  tasks: Item[]
  notes: Item[]
  ideas: Item[]
  shoppingItems: Item[]
  counts: {
    tasks: number
    notes: number
    ideas: number
    shopping: number
  }
}
```

Remplacer par :
```typescript
import type { List } from '@/types/lists'
// ...

interface ClarteData {
  tasks: Item[]
  notes: Item[]
  ideas: Item[]
  listsWithCounts: Array<List & { activeCount: number }>
  counts: {
    tasks: number
    notes: number
    ideas: number
    shopping: number
  }
}
```

- [ ] **Step 3 : Remplacer le fetch shopping par le fetch listes**

Dans `fetchData`, trouver le bloc qui charge `shoppingItems` (chercher `list_item` ou `shoppingLimit`) et remplacer par :

```typescript
import { getListsWithCounts } from '@/services/lists.service'

// Dans fetchData, à la place du fetch shopping :
const listsWithCounts = await getListsWithCounts(supabase, user.id)
const shoppingTotal = listsWithCounts.reduce((sum, l) => sum + l.activeCount, 0)
```

Puis dans le `setData(...)`, remplacer `shoppingItems` par `listsWithCounts` et recalculer `counts.shopping` avec `shoppingTotal`.

- [ ] **Step 4 : Build**

```bash
cd /Users/sandrinelay/Projets/manae-v2 && npm run build 2>&1 | grep -E "error TS" | head -20
```

Corriger toutes les erreurs TypeScript (les appelants de `data.shoppingItems` vont casser — les corriger dans les étapes suivantes).

- [ ] **Step 5 : Commit**

```bash
git add hooks/useClarteData.ts
git commit -m "feat(lists): replace shoppingItems with listsWithCounts in useClarteData"
```

---

### Task 4 : Mettre à jour ShoppingBlock

**Files:**
- Modifier : `components/clarte/blocks/ShoppingBlock.tsx`

Le bloc actuel affiche une grille de chips. Il doit afficher une liste de résumés par liste (nom + compteur actif), cliquable pour ouvrir le bon onglet.

- [ ] **Step 1 : Lire le fichier actuel**

```bash
cat /Users/sandrinelay/Projets/manae-v2/components/clarte/blocks/ShoppingBlock.tsx
```

- [ ] **Step 2 : Réécrire `ShoppingBlock.tsx`**

```typescript
'use client'

import { ChevronRight } from 'lucide-react'
import { EmptyState, EMPTY_STATE_CONFIG } from '../EmptyState'
import type { List, ListSlug } from '@/types/lists'

interface ListWithCount extends List {
  activeCount: number
}

interface ShoppingBlockProps {
  listsWithCounts: ListWithCount[]
  onViewAll?: () => void
  onOpenList?: (slug: ListSlug) => void
}

export function ShoppingBlock({ listsWithCounts, onViewAll, onOpenList }: ShoppingBlockProps) {
  const nonEmptyLists = listsWithCounts.filter(l => l.activeCount > 0)
  const totalCount = listsWithCounts.reduce((sum, l) => sum + l.activeCount, 0)

  return (
    <section>
      <button
        onClick={onViewAll}
        className="w-full flex items-center justify-between mb-3 group"
      >
        <h2 className="typo-section-label group-hover:text-primary/80 transition-colors">
          Achats
        </h2>
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <span className="text-xs text-text-muted">
              {totalCount} article{totalCount > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-xs text-text-muted group-hover:text-primary transition-colors">
            →
          </span>
        </div>
      </button>

      {totalCount === 0 ? (
        <EmptyState {...EMPTY_STATE_CONFIG.shopping} />
      ) : (
        <div className="space-y-1">
          {nonEmptyLists.map(list => (
            <button
              key={list.id}
              onClick={() => onOpenList?.(list.slug as ListSlug)}
              className="w-full flex items-center justify-between py-1.5 text-left hover:bg-gray-50 rounded-lg px-1 transition-colors"
            >
              <span className="text-sm text-text-dark">{list.name}</span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-text-muted">
                  {list.activeCount} article{list.activeCount > 1 ? 's' : ''}
                </span>
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 3 : Mettre à jour l'appelant de ShoppingBlock dans la page Clarté**

Lire `app/(main)/clarte/page.tsx` :

```bash
cat /Users/sandrinelay/Projets/manae-v2/app/\(main\)/clarte/page.tsx
```

Trouver où `<ShoppingBlock>` est appelé et mettre à jour les props :
- Remplacer `items={data.shoppingItems}` par `listsWithCounts={data.listsWithCounts}`
- Remplacer `onToggleItem` par `onOpenList`
- Ajouter le handler `onOpenList` qui ouvre `ShoppingFullView` sur le bon onglet (passer un `initialTab` state)

- [ ] **Step 4 : Build**

```bash
cd /Users/sandrinelay/Projets/manae-v2 && npm run build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 5 : Commit**

```bash
git add components/clarte/blocks/ShoppingBlock.tsx app/\(main\)/clarte/page.tsx
git commit -m "feat(lists): update ShoppingBlock with per-list summary"
```

---

### Task 5 : Réécrire ShoppingFullView avec onglets

**Files:**
- Modifier : `components/clarte/views/ShoppingFullView.tsx`

La vue actuelle a 2 onglets (À acheter / Achetés). Elle devient N onglets (une par liste activée).

- [ ] **Step 1 : Lire le fichier actuel en entier**

```bash
cat /Users/sandrinelay/Projets/manae-v2/components/clarte/views/ShoppingFullView.tsx
```

- [ ] **Step 2 : Identifier les éléments à conserver**

Garder intactes ces logiques :
- Toggle item completed (`toggleShoppingItem`)
- Clear completed (`clearCompletedShoppingItems`)
- Quick add input (`addShoppingItem`)
- `groupByCategory` pour l'onglet Alimentaire
- `ShoppingItemRow`, `ShoppingItemModal`, `CategorySelectorModal`

- [ ] **Step 3 : Modifier les props**

Changer `ShoppingFullViewProps` pour :

```typescript
interface ShoppingFullViewProps {
  lists: Array<List & { activeCount: number }>
  initialTab?: ListSlug
  onClose: () => void
}
```

Supprimer la prop `items` (les items sont chargés dynamiquement par onglet).

- [ ] **Step 4 : Ajouter l'état de l'onglet actif et le chargement par liste**

En haut du composant :

```typescript
import { createClient } from '@/lib/supabase/client'
import { getItemsByList, moveItemToList } from '@/services/lists.service'
import type { List, ListSlug } from '@/types/lists'

const [activeTab, setActiveTab] = useState<ListSlug>(initialTab || (lists[0]?.slug as ListSlug) || 'alimentaire')
const [items, setItems] = useState<Item[]>([])
const [isLoadingItems, setIsLoadingItems] = useState(true)

const activeList = lists.find(l => l.slug === activeTab) ?? null

const loadItems = useCallback(async () => {
  if (!activeList) return
  setIsLoadingItems(true)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const data = await getItemsByList(supabase, user.id, activeList.id)
  setItems(data)
  setIsLoadingItems(false)
}, [activeList])

useEffect(() => {
  loadItems()
}, [loadItems])
```

- [ ] **Step 5 : Ajouter la barre d'onglets**

Remplacer la `<TabBar>` actuelle (À acheter / Achetés) par :

```typescript
{/* Onglets listes — scrollables */}
<div className="flex gap-2 overflow-x-auto pb-2 px-4 shrink-0 scrollbar-none border-b border-border">
  {lists.map(list => {
    const count = list.activeCount
    return (
      <button
        key={list.slug}
        onClick={() => setActiveTab(list.slug as ListSlug)}
        className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
          activeTab === list.slug
            ? 'bg-primary text-white'
            : 'bg-gray-100 text-text-muted hover:bg-gray-200'
        }`}
      >
        {list.name}{count > 0 ? ` ${count}` : ''}
      </button>
    )
  })}
</div>
```

- [ ] **Step 6 : Adapter le contenu (items actifs + cochés)**

```typescript
const activeItems = items.filter(i => i.state === 'active')
const completedItems = items.filter(i => i.state === 'completed')
```

Onglet Alimentaire → `groupByCategory(activeItems)` (conserver la logique existante)
Autres onglets → liste plate sans groupes

- [ ] **Step 7 : Adapter le quick-add pour passer `list_id`**

Dans `handleAddItem`, passer `list_id: activeList.id` lors de l'appel à `addShoppingItem`. Vérifier la signature de `addShoppingItem` dans `services/shopping.service.ts` et l'adapter si nécessaire.

- [ ] **Step 8 : Build**

```bash
cd /Users/sandrinelay/Projets/manae-v2 && npm run build 2>&1 | grep -E "error TS" | head -30
```

- [ ] **Step 9 : Commit**

```bash
git add components/clarte/views/ShoppingFullView.tsx
git commit -m "feat(lists): rewrite ShoppingFullView with 5-tab interface"
```

---

### Task 6 : Ajouter "Déplacer vers…" dans ShoppingItemModal

**Files:**
- Modifier : `components/clarte/modals/ShoppingItemModal.tsx`

- [ ] **Step 1 : Ajouter les props nécessaires**

```typescript
interface ShoppingItemModalProps {
  item: Item
  availableLists: List[]       // Toutes les listes activées
  currentListId: string        // Liste actuelle de l'item
  onClose: () => void
  onEdit: (id: string, content: string, category: ShoppingCategory) => void
  onDelete: (id: string) => void
  onToggle: (id: string) => void
  onMove: (id: string, targetListId: string) => void  // Nouveau
}
```

- [ ] **Step 2 : Ajouter l'état du sélecteur**

```typescript
const [showMoveSelector, setShowMoveSelector] = useState(false)
const otherLists = availableLists.filter(l => l.id !== currentListId)
```

- [ ] **Step 3 : Ajouter le bouton "Déplacer vers…" en mode lecture**

Dans la section actions (hors mode édition), après "Modifier" :

```typescript
{otherLists.length > 0 && (
  <ActionButton
    label="Déplacer"
    variant="secondary"
    onClick={() => setShowMoveSelector(!showMoveSelector)}
    className="flex-1"
  />
)}
```

- [ ] **Step 4 : Ajouter le sélecteur de liste**

Sous les boutons d'action, si `showMoveSelector` :

```typescript
{showMoveSelector && (
  <div className="px-4 pb-4">
    <p className="text-xs text-text-muted mb-2">Déplacer vers :</p>
    <div className="flex flex-wrap gap-2">
      {otherLists.map(list => (
        <button
          key={list.id}
          onClick={() => {
            onMove(item.id, list.id)
            onClose()
          }}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-text-dark transition-colors"
        >
          {list.name}
        </button>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 5 : Mettre à jour les appelants de ShoppingItemModal**

Chercher tous les endroits où `<ShoppingItemModal>` est monté :

```bash
grep -rn "ShoppingItemModal" /Users/sandrinelay/Projets/manae-v2/components --include="*.tsx"
```

Pour chaque appelant, ajouter les props `availableLists`, `currentListId`, et `onMove`.

- [ ] **Step 6 : Build**

```bash
cd /Users/sandrinelay/Projets/manae-v2 && npm run build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 7 : Commit**

```bash
git add components/clarte/modals/ShoppingItemModal.tsx
git commit -m "feat(lists): add 'Déplacer vers' in ShoppingItemModal"
```

---

### Task 7 : Adapter PlanShoppingModal par liste

**Files:**
- Modifier : `components/clarte/modals/PlanShoppingModal.tsx`

- [ ] **Step 1 : Lire le fichier actuel**

```bash
cat /Users/sandrinelay/Projets/manae-v2/components/clarte/modals/PlanShoppingModal.tsx
```

- [ ] **Step 2 : Ajouter `listName` dans les props**

```typescript
interface PlanShoppingModalProps {
  listName: string       // ex: "Alimentaire"
  itemCount: number
  onClose: () => void
  onSuccess: () => void
}
```

- [ ] **Step 3 : Mettre à jour le `taskContent`**

```typescript
const scheduling = useScheduling({
  itemId: `shopping-${listName.toLowerCase()}`,
  taskContent: `Achats ${listName} (${itemCount} article${itemCount > 1 ? 's' : ''})`,
  // ... reste identique
})
```

- [ ] **Step 4 : Mettre à jour les appelants**

Chercher où `<PlanShoppingModal>` est utilisé et passer `listName`.

- [ ] **Step 5 : Build + Commit**

```bash
cd /Users/sandrinelay/Projets/manae-v2 && npm run build 2>&1 | grep -E "error TS" | head -20
git add components/clarte/modals/PlanShoppingModal.tsx
git commit -m "feat(lists): plan shopping per list in PlanShoppingModal"
```

---

## Chunk 3 : Onboarding + Profil

### Task 8 : Créer l'étape onboarding de choix des listes

**Files:**
- Créer : `app/onboarding/step4/page.tsx`
- Modifier : `app/onboarding/step3/page.tsx` (redirection)

**Contexte :** L'étape 3 actuelle (GCal) redirige vers `/capture`. La nouvelle étape 4 (listes) s'intercale : step3 → step4 → `/capture`.

- [ ] **Step 1 : Modifier step3 pour rediriger vers step4**

Dans `app/onboarding/step3/page.tsx`, chercher les `router.push('/capture')` et les remplacer par `router.push('/onboarding/step4')`. Ne pas modifier `router.push('/capture?resumePlanning=true')` (flux planification — à garder tel quel).

- [ ] **Step 2 : Créer `app/onboarding/step4/page.tsx`**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getAllLists, updateListEnabled } from '@/services/lists.service'
import { Button } from '@/components/ui/Button'
import type { List } from '@/types/lists'

export default function OnboardingStep5() {
  const router = useRouter()
  const [lists, setLists] = useState<List[]>([])
  const [enabled, setEnabled] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const allLists = await getAllLists(supabase, user.id)
      setLists(allLists)
      const initial: Record<string, boolean> = {}
      for (const l of allLists) {
        initial[l.id] = l.enabled
      }
      setEnabled(initial)
      setIsLoading(false)
    }
    load()
  }, [])

  const handleToggle = (listId: string, slug: string) => {
    if (slug === 'alimentaire') return  // Non modifiable
    setEnabled(prev => ({ ...prev, [listId]: !prev[listId] }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const supabase = createClient()
      await Promise.all(
        lists
          .filter(l => l.slug !== 'alimentaire')
          .map(l => updateListEnabled(supabase, l.id, enabled[l.id]))
      )
      router.push('/capture')
    } catch (err) {
      console.error('Erreur sauvegarde listes:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mint flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mint flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-text-dark mb-2 text-center">
          Tes listes d'achats
        </h1>
        <p className="text-text-muted text-center mb-8">
          Choisis celles dont tu as besoin. Tu pourras modifier ça plus tard dans ton profil.
        </p>

        <div className="space-y-3 mb-8">
          {lists.map(list => {
            const isAlimentaire = list.slug === 'alimentaire'
            const isEnabled = enabled[list.id] ?? true

            return (
              <button
                key={list.id}
                onClick={() => handleToggle(list.id, list.slug)}
                disabled={isAlimentaire}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                  isEnabled
                    ? 'border-primary bg-white'
                    : 'border-transparent bg-white/60'
                } ${isAlimentaire ? 'opacity-80 cursor-default' : 'cursor-pointer hover:border-primary/50'}`}
              >
                <span className={`font-medium ${isEnabled ? 'text-text-dark' : 'text-text-muted'}`}>
                  {list.name}
                </span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isEnabled ? 'border-primary bg-primary' : 'border-gray-300'
                }`}>
                  {isEnabled && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? 'Enregistrement...' : 'Commencer →'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3 : Build**

```bash
cd /Users/sandrinelay/Projets/manae-v2 && npm run build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 4 : Commit**

```bash
git add app/onboarding/step4/page.tsx app/onboarding/step3/page.tsx
git commit -m "feat(lists): add onboarding step4 for list selection"
```

---

### Task 9 : Section "Mes listes" dans le profil

**Files:**
- Modifier : `app/(main)/profil/page.tsx`

- [ ] **Step 1 : Lire la page profil**

```bash
cat /Users/sandrinelay/Projets/manae-v2/app/\(main\)/profil/page.tsx | head -100
```

Identifier où ajouter la section (chercher la fin d'une section existante comme les contraintes ou les préférences).

- [ ] **Step 2 : Ajouter un hook de chargement des listes en haut du composant**

```typescript
import { createClient } from '@/lib/supabase/client'
import { getAllLists, updateListEnabled } from '@/services/lists.service'
import type { List } from '@/types/lists'

// Dans le composant :
const [lists, setLists] = useState<List[]>([])

useEffect(() => {
  const load = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const allLists = await getAllLists(supabase, user.id)
    setLists(allLists)
  }
  load()
}, [])

const handleToggleList = async (listId: string, currentEnabled: boolean) => {
  const supabase = createClient()
  await updateListEnabled(supabase, listId, !currentEnabled)
  setLists(prev => prev.map(l => l.id === listId ? { ...l, enabled: !l.enabled } : l))
}
```

- [ ] **Step 3 : Ajouter la section dans le JSX**

Trouver un endroit logique (après les contraintes horaires ou avant la déconnexion) et ajouter :

```typescript
{/* Mes listes d'achats */}
{lists.length > 0 && (
  <section className="mt-8">
    <h2 className="typo-section-label mb-4">Mes listes d'achats</h2>
    <div className="space-y-2">
      {lists.map(list => {
        const isAlimentaire = list.slug === 'alimentaire'
        return (
          <div
            key={list.id}
            className="flex items-center justify-between p-3 bg-white rounded-xl border border-border"
          >
            <span className="text-sm text-text-dark">{list.name}</span>
            <button
              onClick={() => !isAlimentaire && handleToggleList(list.id, list.enabled)}
              disabled={isAlimentaire}
              className={`relative w-10 h-6 rounded-full transition-colors ${
                list.enabled ? 'bg-primary' : 'bg-gray-200'
              } ${isAlimentaire ? 'cursor-default opacity-60' : 'cursor-pointer'}`}
              aria-label={`${list.enabled ? 'Désactiver' : 'Activer'} la liste ${list.name}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                list.enabled ? 'translate-x-5' : 'translate-x-1'
              }`} />
            </button>
          </div>
        )
      })}
    </div>
  </section>
)}
```

- [ ] **Step 4 : Build + Commit**

```bash
cd /Users/sandrinelay/Projets/manae-v2 && npm run build 2>&1 | grep -E "error TS" | head -20
git add app/\(main\)/profil/page.tsx
git commit -m "feat(lists): add 'Mes listes d'achats' section in profile"
```

---

## Chunk 4 : IA + API route

### Task 10 : Ajouter `list_slug` dans le prompt IA

**Files:**
- Modifier : `prompts/analyze.ts`

- [ ] **Step 1 : Lire le prompt actuel**

```bash
cat /Users/sandrinelay/Projets/manae-v2/prompts/analyze.ts
```

- [ ] **Step 2 : Mettre à jour la règle `list_item`**

Trouver la section qui décrit les `list_item` (chercher "COURSES" ou "list_item"). Ajouter après les règles de catégorie existantes :

```
LISTE D'ACHATS (list_slug) — OBLIGATOIRE pour list_item :
- "alimentaire" : nourriture, boissons, produits frais, hygiène personnelle (lait, pain, œufs, fromage, shampoing, savon, gel douche)
- "maison" : entretien ménager, bricolage, jardinage (lessive, éponges, ampoules, piles, détergent, plantes, outils)
- "enfants" : scolaire, vêtements enfants, jouets, activités (cahiers, crayons, cartable, baskets enfant, jouets)
- "pro" : matériel bureau, logiciels, abonnements professionnels, fournitures de bureau (stylos, post-its, imprimante, abonnement Notion)
- "en-ligne" : commandes internet, cas ambigus (tout ce qui ne rentre pas clairement dans les autres catégories)

RÈGLES DE PRIORITÉ :
- Alimentaire = ce qu'on mange ou boit UNIQUEMENT (lessive → maison, pas alimentaire)
- "fournitures scolaires" → enfants (contexte enfant prime sur pro)
- "stylos, post-its" sans mention école → pro
- Ambigu → en-ligne (pas alimentaire)
```

- [ ] **Step 3 : Ajouter `list_slug` dans le JSON_FORMAT**

Trouver la section `JSON_FORMAT` ou le template de réponse. Pour les `list_item`, ajouter :

```
"list_slug": "alimentaire|maison|enfants|pro|en-ligne"
```

Exemple avant/après :
```
// Avant
{ "content": "Lait", "type": "list_item", "extracted_data": { "category": "dairy" } }

// Après
{ "content": "Lait", "type": "list_item", "list_slug": "alimentaire", "extracted_data": { "category": "dairy" } }
```

- [ ] **Step 4 : Ajouter 5 exemples ciblés**

Dans la section d'exemples, ajouter :
```
"Lessive et éponges" → [{ content: "Lessive", list_slug: "maison" }, { content: "Éponges", list_slug: "maison" }]
"Cahiers et stylos pour l'école" → [{ content: "Cahiers", list_slug: "enfants" }, { content: "Stylos", list_slug: "enfants" }]
"Commander une webcam" → [{ content: "Webcam", list_slug: "en-ligne" }]
"Post-its et bloc-notes" → [{ content: "Post-its", list_slug: "pro" }, { content: "Bloc-notes", list_slug: "pro" }]
"Shampoing et pain" → [{ content: "Shampoing", list_slug: "alimentaire" }, { content: "Pain", list_slug: "alimentaire" }]
```

Note : shampoing → alimentaire car hygiène personnelle (rayon supermarché alimentaire).

- [ ] **Step 5 : Commit**

```bash
git add prompts/analyze.ts
git commit -m "feat(lists): add list_slug detection rules to AI prompt"
```

---

### Task 11 : Persister `list_id` dans l'API route analyze-v2

**Files:**
- Modifier : `app/api/analyze-v2/route.ts`

- [ ] **Step 1 : Lire le fichier**

```bash
cat /Users/sandrinelay/Projets/manae-v2/app/api/analyze-v2/route.ts
```

- [ ] **Step 2 : Identifier le type de parsing de la réponse IA**

Trouver le type/interface qui parse la réponse JSON de l'IA. Ajouter `list_slug` :

```typescript
interface AnalyzedItem {
  content: string
  type: string
  state?: string
  context?: string
  list_slug?: string   // Nouveau — présent seulement pour list_item
  extracted_data?: Record<string, unknown>
  // ... autres champs existants
}
```

- [ ] **Step 3 : Ajouter la résolution `list_slug` → `list_id`**

Dans la boucle qui crée les items, après avoir déterminé que le type est `list_item` :

```typescript
import { getListBySlug } from '@/services/lists.service'
import type { ListSlug } from '@/types/lists'

// Dans la boucle de création des items :
let listId: string | undefined = undefined

if (analyzedItem.type === 'list_item' && analyzedItem.list_slug) {
  const list = await getListBySlug(
    supabase,
    userId,
    analyzedItem.list_slug as ListSlug
  )
  if (list) {
    listId = list.id
  }
  // Si la liste n'est pas trouvée (liste désactivée ?), on insère sans list_id
}

const itemToInsert = {
  // ... champs existants
  list_id: listId ?? null,
}
```

- [ ] **Step 4 : Build final**

```bash
cd /Users/sandrinelay/Projets/manae-v2 && npm run build 2>&1
```

Expected : build réussi sans erreur TypeScript.

- [ ] **Step 5 : Test manuel**

1. Capture : "Acheter du lait et de la lessive" → vérifier que 2 items sont créés, lait en Alimentaire et lessive en Maison
2. Capture : "Commande une webcam sur Amazon" → vérifier item en En ligne
3. Vérifier dans Supabase que les `list_id` sont bien renseignés
4. Vérifier l'affichage dans ShoppingFullView (bon onglet)

- [ ] **Step 6 : Commit final**

```bash
git add app/api/analyze-v2/route.ts
git commit -m "feat(lists): persist list_id from AI list_slug in analyze-v2"
```
