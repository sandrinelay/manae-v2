# Sprint 6 — Listes d'achats multiples Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la liste de courses unique par 5 listes d'achats distinctes (Alimentaire, Maison, Enfants, Pro, En ligne), accessibles via onglets, avec détection automatique par l'IA.

**Architecture:** Nouvelle table `lists` en DB, `list_id` sur `items` activé vers cette table. Service dédié `lists.service.ts`. UI mise à jour avec onglets dans `ShoppingFullView` et résumé par liste dans `ShoppingBlock`. Prompt IA étendu avec champ `list_slug`.

**Tech Stack:** Next.js 16, Supabase PostgreSQL + RLS, TypeScript, Tailwind CSS 4, OpenAI (prompt)

---

## Fichiers

| Action | Fichier | Rôle |
|--------|---------|------|
| Créer | `supabase/migrations/007_lists.sql` | Table lists + RLS + trigger seed + migration items |
| Créer | `types/lists.ts` | Type `List` |
| Créer | `services/lists.service.ts` | getLists, getItemsByList |
| Modifier | `constants/labels.ts` | "Courses" → "Achats" |
| Modifier | `components/clarte/blocks/ShoppingBlock.tsx` | Résumé par liste |
| Modifier | `components/clarte/views/ShoppingFullView.tsx` | Onglets 5 listes |
| Modifier | `prompts/analyze.ts` | Champ list_slug + règles détection |
| Modifier | `app/api/analyze-v2/route.ts` | Persister list_id sur l'item créé |

---

## Chunk 1: Base de données + Types + Service

### Task 1: Migration Supabase

**Files:**
- Create: `supabase/migrations/007_lists.sql`

**Contexte:** La table `items` a déjà une colonne `list_id` pointant vers `shopping_lists` (ancien système). On crée la nouvelle table `lists` et on migre.

- [ ] **Step 1: Créer `supabase/migrations/007_lists.sql`**

```sql
-- ============================================
-- Table lists : 5 listes d'achats par utilisateur
-- ============================================

create table if not exists lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  slug text not null,
  position int not null,
  created_at timestamptz default now(),
  unique(user_id, slug)
);

-- RLS
alter table lists enable row level security;

create policy "users see own lists"
  on lists for select
  using (auth.uid() = user_id);

create policy "users insert own lists"
  on lists for insert
  with check (auth.uid() = user_id);

create policy "users update own lists"
  on lists for update
  using (auth.uid() = user_id);

create policy "users delete own lists"
  on lists for delete
  using (auth.uid() = user_id);

-- ============================================
-- Seed : fonction pour créer les 5 listes
-- ============================================

create or replace function create_default_lists(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  insert into lists (user_id, name, slug, position) values
    (p_user_id, 'Alimentaire', 'alimentaire', 1),
    (p_user_id, 'Maison',      'maison',      2),
    (p_user_id, 'Enfants',     'enfants',     3),
    (p_user_id, 'Pro',         'pro',         4),
    (p_user_id, 'En ligne',    'en-ligne',    5)
  on conflict (user_id, slug) do nothing;
end;
$$;

-- Trigger : crée les listes à chaque nouvel utilisateur
create or replace function handle_new_user_lists()
returns trigger
language plpgsql
security definer
as $$
begin
  perform create_default_lists(new.id);
  return new;
end;
$$;

-- Attacher le trigger sur auth.users (si pas déjà un trigger existant)
drop trigger if exists on_auth_user_created_lists on auth.users;
create trigger on_auth_user_created_lists
  after insert on auth.users
  for each row execute procedure handle_new_user_lists();

-- ============================================
-- Migration : créer les listes pour les utilisateurs existants
-- ============================================

do $$
declare
  r record;
begin
  for r in select id from auth.users loop
    perform create_default_lists(r.id);
  end loop;
end;
$$;

-- ============================================
-- Migration items : assigner list_id aux items sans liste
-- ============================================

-- Mettre à jour list_id des list_item existants sans list_id
-- vers la liste "alimentaire" de leur utilisateur
update items
set list_id = l.id
from lists l
where items.type = 'list_item'
  and items.list_id is null
  and l.user_id = items.user_id
  and l.slug = 'alimentaire';
```

- [ ] **Step 2: Appliquer la migration**

```bash
cd /Users/sandrinelay/Projets/manae-v2
npx supabase db push
```

Expected: Migration appliquée sans erreur.

- [ ] **Step 3: Vérifier en base**

Vérifier dans le dashboard Supabase ou via psql :
- Table `lists` créée avec les bonnes colonnes
- Les 5 listes créées pour les utilisateurs existants
- Les `list_item` existants ont un `list_id` non null

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/007_lists.sql
git commit -m "feat(lists): add lists table with RLS, seed trigger, and item migration"
```

---

### Task 2: Type List + Service

**Files:**
- Create: `types/lists.ts`
- Create: `services/lists.service.ts`

- [ ] **Step 1: Créer `types/lists.ts`**

```typescript
export interface List {
  id: string
  user_id: string
  name: string
  slug: ListSlug
  position: number
  created_at: string
}

export type ListSlug = 'alimentaire' | 'maison' | 'enfants' | 'pro' | 'en-ligne'

export const LIST_SLUGS: ListSlug[] = ['alimentaire', 'maison', 'enfants', 'pro', 'en-ligne']

export const LIST_NAMES: Record<ListSlug, string> = {
  'alimentaire': 'Alimentaire',
  'maison': 'Maison',
  'enfants': 'Enfants',
  'pro': 'Pro',
  'en-ligne': 'En ligne',
}
```

- [ ] **Step 2: Créer `services/lists.service.ts`**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { List, ListSlug } from '@/types/lists'
import type { Item } from '@/types/items'

/**
 * Retourne les listes de l'utilisateur, triées par position.
 * Silencieux : retourne [] en cas d'erreur.
 */
export async function getLists(
  supabase: SupabaseClient,
  userId: string
): Promise<List[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })

  if (error) {
    console.warn('[lists] getLists failed:', error.message)
    return []
  }

  return data || []
}

/**
 * Retourne les items d'une liste spécifique.
 * Items actifs + complétés, triés par date de création.
 */
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

/**
 * Retourne le nombre d'items actifs par liste.
 * Utilisé pour le résumé dans ShoppingBlock.
 */
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

/**
 * Retourne la liste par son slug pour un utilisateur donné.
 */
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
```

- [ ] **Step 3: Vérifier la compilation**

```bash
cd /Users/sandrinelay/Projets/manae-v2 && npm run build 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add types/lists.ts services/lists.service.ts
git commit -m "feat(lists): add List type and lists.service.ts"
```

---

## Chunk 2: UI — ShoppingBlock + Labels

### Task 3: Renommer "Courses" → "Achats" dans les labels

**Files:**
- Modify: `constants/labels.ts`

- [ ] **Step 1: Lire `constants/labels.ts` et repérer toutes les occurrences de "Courses"**

```bash
grep -n "Courses\|courses\|course" /Users/sandrinelay/Projets/manae-v2/constants/labels.ts
```

- [ ] **Step 2: Remplacer toutes les occurrences** dans `constants/labels.ts`

Chercher et remplacer :
- `"Courses"` → `"Achats"`
- `"courses"` → `"achats"` (si dans des clés de config)
- `"liste de courses"` → `"liste d'achats"`
- `"Faire les courses"` → `"Faire les achats"`

- [ ] **Step 3: Chercher d'autres fichiers contenant "Courses" (hors migrations)**

```bash
grep -rn "Courses\|faire les courses" /Users/sandrinelay/Projets/manae-v2/components /Users/sandrinelay/Projets/manae-v2/app /Users/sandrinelay/Projets/manae-v2/constants --include="*.ts" --include="*.tsx" 2>/dev/null
```

Remplacer dans chaque fichier trouvé.

- [ ] **Step 4: Commit**

```bash
git add -p
git commit -m "refactor(lists): rename 'Courses' to 'Achats' across UI labels"
```

---

### Task 4: Mettre à jour ShoppingBlock

**Files:**
- Modify: `components/clarte/blocks/ShoppingBlock.tsx`

**Contexte:** Actuellement, ce bloc affiche une liste plate. Il doit afficher un résumé par liste (listes vides masquées). Tap sur une ligne → ouvre la vue complète sur l'onglet correspondant.

- [ ] **Step 1: Lire le fichier actuel**

```bash
cat /Users/sandrinelay/Projets/manae-v2/components/clarte/blocks/ShoppingBlock.tsx
```

- [ ] **Step 2: Modifier `ShoppingBlock.tsx` pour le résumé par liste**

Le composant doit :
- Recevoir une prop `onOpenList?: (slug: ListSlug) => void` pour ouvrir un onglet spécifique
- Afficher le résumé avec `getListsWithCounts` depuis le service

Modifier la structure du composant pour qu'il accepte en props les données pré-chargées (pas de fetch interne) :

```typescript
'use client'

import { ChevronRight } from 'lucide-react'
import type { List } from '@/types/lists'
import type { ListSlug } from '@/types/lists'

interface ListWithCount extends List {
  activeCount: number
}

interface ShoppingBlockProps {
  listsWithCounts: ListWithCount[]
  onViewAll?: () => void
  onOpenList?: (slug: ListSlug) => void
}

export function ShoppingBlock({ listsWithCounts, onViewAll, onOpenList }: ShoppingBlockProps) {
  // Masquer les listes vides
  const nonEmptyLists = listsWithCounts.filter(l => l.activeCount > 0)
  const totalCount = listsWithCounts.reduce((sum, l) => sum + l.activeCount, 0)

  if (totalCount === 0) {
    return (
      <div className="...">  {/* garder le style existant pour état vide */}
        <p className="text-sm text-text-muted">Aucun article dans vos listes</p>
      </div>
    )
  }

  return (
    <div className="...">  {/* garder le style existant du bloc */}
      {/* Header bloc */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="typo-section-title">Achats</h2>
        {onViewAll && (
          <button onClick={onViewAll} className="text-sm text-primary">
            Voir tout
          </button>
        )}
      </div>

      {/* Résumé par liste */}
      <div className="space-y-1">
        {nonEmptyLists.map(list => (
          <button
            key={list.id}
            onClick={() => onOpenList?.(list.slug as ListSlug)}
            className="w-full flex items-center justify-between py-1.5 text-left"
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
    </div>
  )
}
```

**Important :** Vérifier comment `ShoppingBlock` est appelé depuis `app/clarte/page.tsx` (ou équivalent) et mettre à jour l'appelant pour lui passer les nouvelles props. Le fetch de `listsWithCounts` se fait dans la page ou un hook.

- [ ] **Step 3: Mettre à jour l'appelant de ShoppingBlock dans la page Clarté**

Lire `app/clarte/page.tsx` et `hooks/useClarteData.ts`. Ajouter le fetch des listes avec compteurs dans `useClarteData` :

Dans `useClarteData.ts`, ajouter au type `ClarteData` :
```typescript
listsWithCounts: Array<List & { activeCount: number }>
```

Dans le fetch, ajouter :
```typescript
import { getListsWithCounts } from '@/services/lists.service'
// ...
const listsWithCounts = await getListsWithCounts(supabase, user.id)
```

- [ ] **Step 4: Vérifier la compilation**

```bash
cd /Users/sandrinelay/Projets/manae-v2 && npm run build 2>&1 | head -50
```

- [ ] **Step 5: Commit**

```bash
git add components/clarte/blocks/ShoppingBlock.tsx hooks/useClarteData.ts app/clarte/
git commit -m "feat(lists): update ShoppingBlock with per-list summary"
```

---

## Chunk 3: ShoppingFullView avec onglets

### Task 5: Réécrire ShoppingFullView avec onglets

**Files:**
- Modify: `components/clarte/views/ShoppingFullView.tsx`

**Contexte:** La vue actuelle a 2 onglets (À acheter / Achetés). Elle devient 5 onglets de listes. L'onglet Alimentaire garde les groupes par catégorie existants. Les autres ont une liste simple.

- [ ] **Step 1: Lire le fichier actuel complet**

```bash
cat /Users/sandrinelay/Projets/manae-v2/components/clarte/views/ShoppingFullView.tsx
```

- [ ] **Step 2: Identifier les éléments à conserver**

Garder :
- La logique de checkbox (toggle `completed`)
- La logique "Vider les cochés" (clear completed items)
- Le quick add input
- Les groupes par catégorie (onglet Alimentaire uniquement)
- `PlanShoppingModal` intégration

- [ ] **Step 3: Modifier la structure des props**

```typescript
interface ShoppingFullViewProps {
  lists: List[]
  initialTab?: ListSlug  // Pour ouvrir directement un onglet depuis ShoppingBlock
  onClose: () => void
}
```

- [ ] **Step 4: Implémenter les onglets**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getItemsByList } from '@/services/lists.service'
import type { List, ListSlug } from '@/types/lists'
import type { Item } from '@/types/items'
// ... autres imports existants

export function ShoppingFullView({ lists, initialTab, onClose }: ShoppingFullViewProps) {
  const [activeTab, setActiveTab] = useState<ListSlug>(initialTab || 'alimentaire')
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const activeList = lists.find(l => l.slug === activeTab)

  // Charger les items de l'onglet actif
  useEffect(() => {
    if (!activeList) return
    setIsLoading(true)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      getItemsByList(supabase, user.id, activeList.id).then(data => {
        setItems(data)
        setIsLoading(false)
      })
    })
  }, [activeList])

  const activeItems = items.filter(i => i.state === 'active')
  const completedItems = items.filter(i => i.state === 'completed')

  // ... toggle completed, clear completed, quick add (logique existante adaptée)

  return (
    <div className="...">
      {/* Onglets scrollables */}
      <div className="flex gap-2 overflow-x-auto pb-2 px-4 scrollbar-none">
        {lists.map(list => (
          <button
            key={list.slug}
            onClick={() => setActiveTab(list.slug as ListSlug)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === list.slug
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-text-muted'
            }`}
          >
            {list.name}
          </button>
        ))}
      </div>

      {/* Contenu de l'onglet actif */}
      <div className="flex-1 overflow-y-auto px-4">
        {isLoading ? (
          <div className="animate-pulse space-y-2 mt-4">
            {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl" />)}
          </div>
        ) : (
          <>
            {activeItems.length === 0 && completedItems.length === 0 && (
              <p className="text-sm text-text-muted text-center mt-8">
                Cette liste est vide
              </p>
            )}

            {/* Onglet Alimentaire : groupes par catégorie (logique existante) */}
            {/* Autres onglets : liste simple */}
            {activeTab === 'alimentaire'
              ? <GroupedItemsList items={activeItems} onToggle={handleToggle} />
              : <SimpleItemsList items={activeItems} onToggle={handleToggle} />
            }

            {/* Items complétés + bouton vider */}
            {completedItems.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-text-muted uppercase tracking-wide">
                    Cochés ({completedItems.length})
                  </span>
                  <button
                    onClick={handleClearCompleted}
                    className="text-xs text-red-500"
                  >
                    Vider les cochés
                  </button>
                </div>
                <SimpleItemsList items={completedItems} onToggle={handleToggle} completed />
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick add (logique existante) */}
    </div>
  )
}
```

Note : `GroupedItemsList` et `SimpleItemsList` sont des sous-composants internes ou des fonctions de rendu à extraire de la logique existante.

- [ ] **Step 5: Vérification et build**

```bash
cd /Users/sandrinelay/Projets/manae-v2 && npm run build 2>&1
```

- [ ] **Step 6: Test manuel**

1. Ouvrir Clarté
2. Cliquer "Voir tout" dans le bloc Achats → vérifier les 5 onglets
3. Taper sur une ligne dans ShoppingBlock → vérifier que l'onglet correspondant s'ouvre
4. Ajouter un article, cocher → vérifier qu'il passe en "Cochés"
5. "Vider les cochés" → vérifier la suppression

- [ ] **Step 7: Commit**

```bash
git add components/clarte/views/ShoppingFullView.tsx
git commit -m "feat(lists): update ShoppingFullView with 5-tab interface"
```

---

## Chunk 4: Prompt IA + API route

### Task 6: Mettre à jour le prompt IA

**Files:**
- Modify: `prompts/analyze.ts`

**Contexte:** Ajouter le champ `list_slug` dans la réponse JSON pour les `list_item`. Les règles de détection sont dans le design doc.

- [ ] **Step 1: Lire `prompts/analyze.ts`**

```bash
cat /Users/sandrinelay/Projets/manae-v2/prompts/analyze.ts
```

- [ ] **Step 2: Ajouter les règles de détection de liste dans le prompt**

Dans la section de rules ou examples, ajouter après les règles de type/contexte existantes :

```
RÈGLES LISTE D'ACHATS (seulement pour les list_item) :
- "alimentaire" : nourriture, boissons, produits frais, hygiène personnelle (lait, pain, shampoing, savon)
- "maison" : entretien, ménage, bricolage, jardinage (lessive, ampoules, piles, éponges, plantes)
- "enfants" : scolaire, vêtements enfants, activités, jouets, fournitures école
- "pro" : matériel bureau, logiciels, abonnements professionnels, fournitures professionnelles
- "en-ligne" : commandes internet, cas ambigus, tout ce qui ne rentre pas dans les autres catégories

Par défaut si ambigu → "en-ligne"
```

- [ ] **Step 3: Ajouter `list_slug` dans le JSON_FORMAT**

Dans la section JSON_FORMAT du prompt, pour les `list_item`, ajouter :

```
"list_slug": "alimentaire" | "maison" | "enfants" | "pro" | "en-ligne"
```

- [ ] **Step 4: Commit**

```bash
git add prompts/analyze.ts
git commit -m "feat(lists): add list_slug detection rules to AI prompt"
```

---

### Task 7: Mettre à jour l'API route analyze-v2

**Files:**
- Modify: `app/api/analyze-v2/route.ts`

**Contexte:** Quand l'IA retourne un `list_item` avec `list_slug`, on doit résoudre le `list_id` correspondant et le persister sur l'item.

- [ ] **Step 1: Lire `app/api/analyze-v2/route.ts`**

```bash
cat /Users/sandrinelay/Projets/manae-v2/app/api/analyze-v2/route.ts
```

- [ ] **Step 2: Ajouter la résolution du list_slug → list_id**

Dans la fonction qui persiste les items créés, pour les `list_item` :

```typescript
import { getListBySlug } from '@/services/lists.service'
import type { ListSlug } from '@/types/lists'

// Pour chaque item de type list_item dans la réponse IA :
if (item.type === 'list_item' && item.list_slug) {
  const list = await getListBySlug(supabase, userId, item.list_slug as ListSlug)
  if (list) {
    itemToInsert.list_id = list.id
  }
  // Si la liste n'est pas trouvée, on insère sans list_id (fallback)
}
```

- [ ] **Step 3: Vérifier que `list_slug` est bien dans le type de réponse IA**

Dans le type qui parse la réponse OpenAI, ajouter :
```typescript
list_slug?: string  // Présent seulement pour les list_item
```

- [ ] **Step 4: Build final complet**

```bash
cd /Users/sandrinelay/Projets/manae-v2 && npm run build 2>&1
```

Expected: Build successful.

- [ ] **Step 5: Test manuel end-to-end**

1. Capture vocale ou texte : "Acheter du lait et du pain"
2. Vérifier que l'item est créé avec `list_id` → liste Alimentaire
3. Capture : "Commander une imprimante en ligne"
4. Vérifier `list_id` → liste En ligne
5. Vérifier l'affichage dans ShoppingFullView (bon onglet)

- [ ] **Step 6: Commit final**

```bash
git add app/api/analyze-v2/route.ts
git commit -m "feat(lists): persist list_id from AI list_slug detection in analyze-v2"
```
