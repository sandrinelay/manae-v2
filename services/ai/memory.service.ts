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
const MIN_COUNT_TO_INJECT = 1

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
        const { count, lastExample } = row.value as MemoryValue
        // key format: "context:personal→work" ou "type:task→note"
        const [dimension, transition] = row.key.split(':')
        const [from, to] = transition.split('→')
        const label = dimension === 'context' ? 'contexte' : 'type'
        const example = lastExample ? ` (ex: "${lastExample}")` : ''
        return `- Utiliser TOUJOURS ${label} '${to}' au lieu de '${from}'${example} — corrigé ${count}× par l'utilisateur`
      })

    if (significant.length === 0) return ''

    return significant.join('\n')
  } catch (err) {
    console.warn('[memory] getMemoryContext failed:', err)
    return ''
  }
}
