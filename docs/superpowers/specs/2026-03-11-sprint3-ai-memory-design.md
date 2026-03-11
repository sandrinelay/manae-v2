# Sprint 3 — Mémoire utilisateur IA

## Objectif

Améliorer la précision de la classification IA en mémorisant silencieusement les corrections rapides de l'utilisateur (type ou contexte modifié dans les 10 minutes suivant la capture), puis en injectant ce contexte dans le prompt à chaque nouvelle analyse.

---

## Architecture & flux de données

```
[Utilisateur corrige type/contexte]
         ↓
updateItemContent() — services/items.service.ts
         ↓
  isQuickCorrection? (< 10 min)
  hasTypeChange ou hasContextChange?
         ↓ oui
recordCorrection() — services/ai/memory.service.ts
         ↓
INSERT/UPDATE user_ai_memory (table existante)
key: "type:task→note" | "context:personal→work"
value: { count: N, lastExample: "..." }

[Nouvelle capture]
         ↓
POST /api/analyze-v2
         ↓
getMemoryContext(userId) — memory.service.ts
         ↓ "Corrections fréquentes : contexte 'personal' → 'work' (3x)"
buildAnalyzePrompt(content, memoryContext)
         ↓
OpenAI gpt-4o-mini
```

---

## Fichiers à créer / modifier

| Fichier | Action | Responsabilité |
|--------|--------|----------------|
| `services/ai/memory.service.ts` | Créer | CRUD `user_ai_memory`, génération du contexte mémoire |
| `services/items.service.ts` | Modifier | Détection correction dans `updateItemContent()` |
| `app/api/analyze-v2/route.ts` | Modifier | Injection mémoire dans le prompt |
| `prompts/analyze.ts` | Modifier | `buildAnalyzePrompt()` accepte `memoryContext?` |

La table `user_ai_memory` est déjà créée (migration 005).

---

## `memory.service.ts` — Interface

```typescript
// services/ai/memory.service.ts

interface CorrectionParams {
  oldType?: string
  newType?: string
  oldContext?: string
  newContext?: string
  content: string
}

/**
 * Enregistre une correction (upsert avec compteur)
 * Silencieux : ne throw pas, log seulement en warn
 */
export async function recordCorrection(
  userId: string,
  itemId: string,
  params: CorrectionParams
): Promise<void>

/**
 * Retourne un résumé textuel des corrections pour injection dans le prompt.
 * Retourne '' si aucune correction ou utilisateur non authentifié.
 * Seuil : corrections avec count >= 2 uniquement (évite le bruit)
 */
export async function getMemoryContext(userId: string): Promise<string>
// Exemple de retour :
// "Corrections fréquentes : contexte 'personal' → 'work' (4x), type 'task' → 'note' (2x)"
```

**Format DB** :
- `memory_type: 'correction'`
- `key: 'type:task→note'` ou `'context:personal→work'`
- `value: { count: number, lastExample: string }`

---

## Détection dans `updateItemContent()`

```typescript
export async function updateItemContent(
  itemId: string,
  updates: Partial<Item>
): Promise<Item> {
  const { data: { user } } = await supabase.auth.getUser()

  const original = await getItemById(itemId)
  const isQuickCorrection = isRecentItem(original.created_at, 10)

  if (user && isQuickCorrection) {
    const hasTypeChange = updates.type && updates.type !== original.type
    const hasContextChange = updates.context && updates.context !== original.context

    if (hasTypeChange || hasContextChange) {
      recordCorrection(user.id, itemId, {
        oldType: original.type,
        newType: updates.type,
        oldContext: original.context,
        newContext: updates.context,
        content: original.content
      }).catch(err => console.warn('[memory] recordCorrection failed:', err))
    }
  }

  return updateItem(itemId, updates)
}
```

Règles :
- Détection < 10 min après `created_at` de l'item
- Fire-and-forget : ne bloque jamais la mise à jour
- Fonctionne pour changement de type ET/OU contexte

---

## Injection dans `analyze-v2/route.ts`

```typescript
// Enrichir le prompt avec la mémoire utilisateur
let memoryContext = ''
if (userId) {
  try {
    memoryContext = await getMemoryContext(userId)
  } catch {
    // Silencieux : la mémoire est une amélioration, pas une dépendance
  }
}

const systemPrompt = buildAnalyzePrompt(content, { memoryContext })
```

---

## `buildAnalyzePrompt()` — Section mémoire

Si `memoryContext` non vide, ajouter une section au prompt système :

```
## Préférences apprises de cet utilisateur
{memoryContext}
Tiens compte de ces préférences pour ajuster ta classification.
```

Section omise si `memoryContext === ''` (nouveaux utilisateurs, pas de bruit).

---

## Comportement attendu

- **Invisible pour l'utilisateur** : aucune UI, aucun message
- **Non-bloquant** : toute erreur mémoire est ignorée silencieusement
- **Progressif** : les corrections s'accumulent, le seuil `count >= 2` évite le bruit
- **Extensible** : la structure DB est prête pour les patterns d'usage (Sprint C futur)

---

## Ce qui est hors scope

- Affichage des corrections dans l'UI
- Option "oublier mes préférences"
- Patterns d'usage (≥ 5 items similaires) → Sprint C futur
- Support multi-device (Supabase RLS suffit)
