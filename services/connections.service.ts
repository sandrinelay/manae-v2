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
