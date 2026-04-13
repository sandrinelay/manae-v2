# Sprint 3 — Mémoire utilisateur IA — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mémoriser silencieusement les corrections de type/contexte de l'utilisateur (dans les 10 min après capture) et les réinjecter dans le prompt OpenAI pour améliorer la classification au fil du temps.

**Architecture:** Un service `memory.service.ts` gère les lectures/écritures dans la table `user_ai_memory` (déjà créée, migration 005). La détection des corrections se fait dans `updateItemContent()` côté browser. L'injection dans le prompt se fait dans `analyze-v2/route.ts` côté serveur, avant l'appel OpenAI.

**Tech Stack:** TypeScript, Supabase (browser + server clients), Next.js App Router, OpenAI gpt-4o-mini

---

## File Map

| Fichier | Action | Rôle |
|--------|--------|------|
| `services/ai/memory.service.ts` | **Créer** | CRUD `user_ai_memory` + génération du contexte mémoire |
| `services/items.service.ts` | **Modifier** | Détecter corrections dans `updateItemContent()` |
| `prompts/types.ts` | **Modifier** | Ajouter `memoryContext?` à `AnalysisContext` |
| `prompts/analyze.ts` | **Modifier** | Utiliser `memoryContext` dans `buildAnalyzePrompt()` |
| `services/ai/analysis.service.ts` | **Modifier** | Passer `memoryContext?` dans `buildAnalysisPrompt()` |
| `app/api/analyze-v2/route.ts` | **Modifier** | Injecter `getMemoryContext()` avant l'appel OpenAI |

---

## Chunk 1: memory.service.ts

### Task 1: Créer le service mémoire

**Files:**
- Create: `services/ai/memory.service.ts`

Ce service est le seul à toucher la table `user_ai_memory`. Il expose deux fonctions :
- `recordCorrection(supabase, userId, itemId, params)` — upsert avec incrémentation du compteur
- `getMemoryContext(supabase, userId)` — retourne un résumé textuel pour injection dans le prompt

**Structure de la table** (migration 005, déjà appliquée) :
```sql
user_ai_memory (
  id, user_id, memory_type TEXT ('correction'|'pattern'),
  key TEXT,          -- ex: "context:personal→work" ou "type:task→note"
  value JSONB,       -- { count: number, lastExample: string }
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id, memory_type, key)
)
```

- [ ] **Step 1: Créer `services/ai/memory.service.ts`**

```typescript
/**
 * Service mémoire IA — mémorise les corrections utilisateur
 * pour améliorer la classification au fil du temps
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ItemType, ItemContext } from '@/types/items'

// ============================================
// TYPES
// ============================================

export interface CorrectionParams {
  oldType?: ItemType
  newType?: ItemType
  oldContext?: ItemContext
  newContext?: ItemContext
  content: string
}

interface MemoryValue {
  count: number
  lastExample: string
}

// Seuil minimum d'occurrences pour injecter dans le prompt
const MIN_COUNT_TO_INJECT = 2

// ============================================
// RECORD CORRECTION
// ============================================

/**
 * Enregistre une correction de type ou contexte.
 * Upsert : incrémente le compteur si la correction existe déjà.
 * Silencieux : ne throw pas, log seulement en warn.
 *
 * @param supabase - Client Supabase (browser ou server)
 * @param userId   - ID de l'utilisateur
 * @param itemId   - ID de l'item corrigé (pour logs)
 * @param params   - Anciennes et nouvelles valeurs
 */
export async function recordCorrection(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
  params: CorrectionParams
): Promise<void> {
  const { oldType, newType, oldContext, newContext, content } = params
  const corrections: Array<{ key: string; example: string }> = []

  if (newType && oldType && newType !== oldType) {
    corrections.push({
      key: `type:${oldType}→${newType}`,
      example: content.substring(0, 100)
    })
  }

  if (newContext && oldContext && newContext !== oldContext) {
    corrections.push({
      key: `context:${oldContext}→${newContext}`,
      example: content.substring(0, 100)
    })
  }

  if (corrections.length === 0) return

  for (const correction of corrections) {
    try {
      // Lire la valeur actuelle (si existante)
      const { data: existing } = await supabase
        .from('user_ai_memory')
        .select('value')
        .eq('user_id', userId)
        .eq('memory_type', 'correction')
        .eq('key', correction.key)
        .maybeSingle()

      const currentValue = existing?.value as MemoryValue | null
      const newValue: MemoryValue = {
        count: (currentValue?.count ?? 0) + 1,
        lastExample: correction.example
      }

      // Upsert
      const { error } = await supabase
        .from('user_ai_memory')
        .upsert(
          {
            user_id: userId,
            memory_type: 'correction',
            key: correction.key,
            value: newValue,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id,memory_type,key' }
        )

      if (error) {
        console.warn(`[memory] recordCorrection upsert failed (${correction.key}):`, error.message)
      } else {
        console.log(`[memory] Correction enregistrée: ${correction.key} (×${newValue.count})`)
      }
    } catch (err) {
      console.warn(`[memory] recordCorrection exception (${correction.key}):`, err)
    }
  }
}

// ============================================
// GET MEMORY CONTEXT
// ============================================

/**
 * Retourne un résumé textuel des corrections fréquentes.
 * Retourne '' si aucune correction significative (count < MIN_COUNT_TO_INJECT).
 * Silencieux : retourne '' en cas d'erreur.
 *
 * @param supabase - Client Supabase (browser ou server)
 * @param userId   - ID de l'utilisateur
 * @returns Texte à injecter dans le prompt, ou '' si vide
 *
 * @example
 * // Retourne :
 * // "Corrections fréquentes : contexte 'personal' → 'work' (4×), type 'task' → 'note' (2×)"
 */
export async function getMemoryContext(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('user_ai_memory')
      .select('key, value')
      .eq('user_id', userId)
      .eq('memory_type', 'correction')
      .order('updated_at', { ascending: false })

    if (error || !data || data.length === 0) return ''

    const significant = data
      .filter(row => (row.value as MemoryValue).count >= MIN_COUNT_TO_INJECT)
      .map(row => {
        const { count } = row.value as MemoryValue
        // key format: "context:personal→work" ou "type:task→note"
        const [dimension, transition] = row.key.split(':')
        const [from, to] = transition.split('→')
        const label = dimension === 'context' ? 'contexte' : 'type'
        return `${label} '${from}' → '${to}' (${count}×)`
      })

    if (significant.length === 0) return ''

    return `Corrections fréquentes : ${significant.join(', ')}`
  } catch (err) {
    console.warn('[memory] getMemoryContext failed:', err)
    return ''
  }
}
```

- [ ] **Step 2: Vérifier que le fichier compile sans erreur**

```bash
cd /Users/sandrinelay/Projets/manae-v2
npx tsc --noEmit --project tsconfig.json 2>&1 | grep "memory.service"
```

Expected: aucune erreur sur `memory.service.ts`

- [ ] **Step 3: Commit**

```bash
git add services/ai/memory.service.ts
git commit -m "feat(memory): add memory.service with recordCorrection and getMemoryContext"
```

---

## Chunk 2: Détection des corrections dans items.service.ts

### Task 2: Étendre `updateItemContent` pour détecter les corrections

**Files:**
- Modify: `services/items.service.ts` (lignes 135–158)

La fonction actuelle a la signature `updateItemContent(id, content, context?)`.
On ajoute un 4ème paramètre optionnel `type?` pour les corrections de classification.
Quand `type` ou `context` est passé, on vérifie si c'est une correction rapide (< 10 min) et on enregistre.

> **Attention** : Les callers existants ne passent que 2 ou 3 args — pas de breaking change.

- [ ] **Step 1: Remplacer `updateItemContent` dans `services/items.service.ts`**

Remplacer les lignes 137–158 :

```typescript
// OLD:
export async function updateItemContent(
  id: string,
  content: string,
  context?: ItemContext
): Promise<void> {
  const supabase = getSupabase()

  const updateData: Record<string, unknown> = {
    content,
    updated_at: new Date().toISOString()
  }

  if (context !== undefined) {
    updateData.context = context
  }

  const { error } = await supabase
    .from('items')
    .update(updateData)
    .eq('id', id)

  if (error) throw error
}
```

Par :

```typescript
/**
 * Met à jour le contenu d'un item et optionnellement son contexte et/ou type.
 * Quand context ou type est passé, déclenche silencieusement la détection
 * de correction IA (fire-and-forget, < 10 min après création).
 *
 * ⚠️ ÉCRITURE DB : si `type` est passé, il est bien écrit en base.
 *    Les callers existants (2 ou 3 args) ne sont pas affectés.
 */
export async function updateItemContent(
  id: string,
  content: string,
  context?: ItemContext,
  type?: ItemType
): Promise<void> {
  const supabase = getSupabase()

  // Détecter les corrections de classification (type ou contexte changé rapidement)
  if (context !== undefined || type !== undefined) {
    detectAndRecordCorrection(supabase, id, { content, context, type })
      .catch(err => console.warn('[items] detectAndRecordCorrection failed:', err))
  }

  const updateData: Record<string, unknown> = {
    content,
    updated_at: new Date().toISOString()
  }

  if (context !== undefined) updateData.context = context
  if (type !== undefined) updateData.type = type

  const { error } = await supabase
    .from('items')
    .update(updateData)
    .eq('id', id)

  if (error) throw error
}
```

- [ ] **Step 2: Ajouter les imports manquants et la fonction helper**

Au début du fichier, ajouter les imports manquants s'ils ne sont pas déjà présents :

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Item, ItemType, ItemState, ItemContext } from '@/types/items'
```

Puis ajouter la fonction helper `detectAndRecordCorrection` juste avant `updateItemContent` :

```typescript
// ============================================
// DÉTECTION CORRECTION IA (helper interne)
// ============================================

const CORRECTION_WINDOW_MINUTES = 10

/**
 * Détecte si une mise à jour de type/contexte est une correction rapide de l'IA.
 * Si oui, enregistre silencieusement dans user_ai_memory.
 * Fire-and-forget : ne bloque jamais la mise à jour principale.
 */
async function detectAndRecordCorrection(
  supabase: SupabaseClient,
  itemId: string,
  updates: { content: string; context?: ItemContext; type?: ItemType }
): Promise<void> {
  // Récupérer l'item original avec created_at et valeurs actuelles
  const { data: original } = await supabase
    .from('items')
    .select('user_id, type, context, created_at')
    .eq('id', itemId)
    .single()

  if (!original) return

  // Vérifier que c'est dans la fenêtre de correction (10 min)
  const createdAt = new Date(original.created_at).getTime()
  const now = Date.now()
  const ageMinutes = (now - createdAt) / 1000 / 60
  if (ageMinutes > CORRECTION_WINDOW_MINUTES) return

  // Vérifier qu'il y a effectivement un changement
  const hasTypeChange = updates.type !== undefined && updates.type !== original.type
  const hasContextChange = updates.context !== undefined && updates.context !== original.context
  if (!hasTypeChange && !hasContextChange) return

  const { recordCorrection } = await import('@/services/ai/memory.service')

  await recordCorrection(supabase, original.user_id, itemId, {
    oldType: original.type,
    newType: updates.type,
    oldContext: original.context,
    newContext: updates.context,
    content: updates.content
  })
}
```

- [ ] **Step 3: Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep -E "(items\.service|memory\.service)"
```

Expected: aucune erreur TypeScript

- [ ] **Step 4: Test manuel — vérifier qu'une correction s'enregistre**

1. Démarrer le serveur : `npm run dev`
2. Capturer une pensée (ex: "appeler la banque")
3. L'IA classe → `context: personal` (probablement)
4. Dans Clarté, changer le contexte → `admin`
5. Vérifier dans Supabase Studio → table `user_ai_memory`:
   - Doit apparaître: `memory_type='correction'`, `key='context:personal→admin'`, `value={count:1, lastExample:"appeler la banque"}`

- [ ] **Step 5: Commit**

```bash
git add services/items.service.ts
git commit -m "feat(memory): detect and record AI classification corrections in updateItemContent"
```

---

## Chunk 3: Injection dans le prompt

### Task 3: Ajouter `memoryContext` au type `AnalysisContext`

**Files:**
- Modify: `prompts/types.ts` (ligne 96–102)

- [ ] **Step 1: Ajouter `memoryContext?` à `AnalysisContext`**

Dans `prompts/types.ts`, remplacer :

```typescript
export interface AnalysisContext {
  rawText: string
  today: Date
  historyContext?: string
  /** Source de la saisie — adapte le traitement du prompt pour la voix */
  source?: 'voice' | 'text'
}
```

Par :

```typescript
export interface AnalysisContext {
  rawText: string
  today: Date
  historyContext?: string
  /** Source de la saisie — adapte le traitement du prompt pour la voix */
  source?: 'voice' | 'text'
  /** Corrections mémorisées de l'utilisateur — injectées dans le prompt si non vide */
  memoryContext?: string
}
```

- [ ] **Step 2: Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep "types\.ts"
```

Expected: aucune erreur

---

### Task 4: Utiliser `memoryContext` dans `buildAnalyzePrompt`

**Files:**
- Modify: `prompts/analyze.ts` (lignes 208–224)

- [ ] **Step 1: Modifier `buildAnalyzePrompt` pour injecter le contexte mémoire**

Dans `prompts/analyze.ts`, remplacer la fonction `buildAnalyzePrompt` (lignes 179–225) :

```typescript
// OLD:
export function buildAnalyzePrompt(context: AnalysisContext): string {
  const { rawText, today, historyContext, source } = context
  // ...
  return `Analyse cette pensée et structure-la.
${sourceNote}
PENSÉE : "${rawText}"
// ...
${historyContext ? `HISTORIQUE : ${historyContext}\n` : ''}
${RULES}
${EXAMPLES}
${JSON_FORMAT}`
}
```

Par :

```typescript
export function buildAnalyzePrompt(context: AnalysisContext): string {
  const { rawText, today, historyContext, source, memoryContext } = context

  // Calculer les dates de référence
  const todayStr = today.toISOString().split('T')[0]
  const dayOfWeek = today.toLocaleDateString('fr-FR', { weekday: 'long' })
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const endOfMonthStr = endOfMonth.toISOString().split('T')[0]

  const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const startOfNextMonthStr = startOfNextMonth.toISOString().split('T')[0]

  const weekDays: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    weekDays.push(`${d.toLocaleDateString('fr-FR', { weekday: 'long' })} = ${d.toISOString().split('T')[0]}`)
  }

  const sourceNote = source === 'voice'
    ? `\n⚠️ SAISIE VOCALE : Ce texte a été dicté à voix haute. Tolère les fautes de syntaxe, phrases sans verbe, hésitations. Applique l'Étape 1 (Nettoyer) avec soin.\n`
    : ''

  // Section mémoire : injectée uniquement si des corrections existent
  const memorySection = memoryContext
    ? `\n## Préférences apprises de cet utilisateur\n${memoryContext}\nTiens compte de ces préférences pour ajuster ta classification.\n`
    : ''

  return `Analyse cette pensée et structure-la.
${sourceNote}
PENSÉE : "${rawText}"

DATES DE RÉFÉRENCE :
- AUJOURD'HUI : ${todayStr} (${dayOfWeek})
- DEMAIN : ${tomorrow.toISOString().split('T')[0]}
- JOURS : ${weekDays.join(', ')}
- FIN DU MOIS : ${endOfMonthStr} ← UTILISER CETTE DATE si "fin du mois" ou "fin de mois"
- DÉBUT MOIS PROCHAIN : ${startOfNextMonthStr} ← UTILISER CETTE DATE si "début du mois prochain"

⚠️ RÈGLE CRITIQUE : Si la pensée contient "fin du mois" ou "fin de mois", alors temporal_constraint.date = "${endOfMonthStr}"

${historyContext ? `HISTORIQUE : ${historyContext}\n` : ''}${memorySection}${RULES}
${EXAMPLES}
${JSON_FORMAT}`
}
```

- [ ] **Step 2: Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep -E "(analyze\.ts|types\.ts)"
```

Expected: aucune erreur

---

### Task 5: Mettre à jour le wrapper `buildAnalysisPrompt`

**Files:**
- Modify: `services/ai/analysis.service.ts` (lignes 31–38)

- [ ] **Step 1: Ajouter `memoryContext?` au wrapper**

Remplacer :

```typescript
export function buildAnalysisPrompt(rawText: string, historyContext?: string, source?: 'voice' | 'text'): string {
  return buildAnalyzePrompt({
    rawText,
    today: new Date(),
    historyContext,
    source
  })
}
```

Par :

```typescript
export function buildAnalysisPrompt(
  rawText: string,
  historyContext?: string,
  source?: 'voice' | 'text',
  memoryContext?: string
): string {
  return buildAnalyzePrompt({
    rawText,
    today: new Date(),
    historyContext,
    source,
    memoryContext
  })
}
```

---

### Task 6: Injecter la mémoire dans `analyze-v2/route.ts`

**Files:**
- Modify: `app/api/analyze-v2/route.ts` (lignes 56–84)

- [ ] **Step 1: Ajouter l'import de `getMemoryContext`**

En haut de `app/api/analyze-v2/route.ts`, après les imports existants :

```typescript
import { getMemoryContext } from '@/services/ai/memory.service'
```

- [ ] **Step 2: Récupérer le contexte mémoire et l'injecter dans l'appel OpenAI**

Localiser le commentaire `// 5. Appel OpenAI` (ligne 56 du fichier actuel). Insérer le bloc suivant **juste avant** cette ligne `// 5. Appel OpenAI` :

```typescript
// 5. Récupérer le contexte mémoire utilisateur (corrections passées)
let memoryContext = ''
try {
  memoryContext = await getMemoryContext(supabase, user.id)
  if (memoryContext) {
    console.log('[analyze-v2] memory context:', memoryContext)
  }
} catch {
  // Silencieux : la mémoire est une amélioration, pas une dépendance critique
}
```

Puis, dans l'appel `openai.chat.completions.create` existant (ligne 69), remplacer uniquement la ligne du message `user` :

```typescript
// AVANT :
{ role: 'user', content: buildAnalysisPrompt(rawText, historyContext, source) }

// APRÈS :
{ role: 'user', content: buildAnalysisPrompt(rawText, historyContext, source, memoryContext) }
```

> **Note :** le commentaire `// 5. Appel OpenAI` doit devenir `// 6. Appel OpenAI`, et les commentaires suivants décalent d'une étape en conséquence.

- [ ] **Step 3: Vérification compilation complète**

```bash
npx tsc --noEmit 2>&1
```

Expected: 0 erreurs TypeScript

- [ ] **Step 4: Test end-to-end**

Scénario de test complet :

1. **Setup** : Dans Supabase Studio, vider la table `user_ai_memory` pour partir de zéro.

2. **Correction 1** : Capturer "appeler la banque" → l'IA classe en `context: personal`.
   - Dans Clarté, changer le contexte → `admin`.
   - Vérifier Supabase : `key='context:personal→admin'`, `count=1`

3. **Correction 2** : Capturer "rappeler le conseiller" → même chose, changer en `admin`.
   - Vérifier Supabase : `count=2` maintenant.

4. **Injection** : Capturer "appeler mon banquier" → vérifier dans les logs console (`[analyze-v2]`) que le prompt contient "Corrections fréquentes : contexte 'personal' → 'admin' (2×)".

5. **Résultat attendu** : L'IA classe directement en `context: admin` (sans correction manuelle).

- [ ] **Step 5: Commit final**

```bash
git add prompts/types.ts prompts/analyze.ts services/ai/analysis.service.ts app/api/analyze-v2/route.ts
git commit -m "feat(memory): inject user correction context into AI analysis prompt"
```

---

## Récapitulatif des commits

```
feat(memory): add memory.service with recordCorrection and getMemoryContext
feat(memory): detect and record AI classification corrections in updateItemContent
feat(memory): inject user correction context into AI analysis prompt
```
