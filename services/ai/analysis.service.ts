import type {
  ItemType,
  ItemState,
  ItemContext,
  AIAnalysis,
  AIAnalyzedItem,
  AIAnalysisResult,
  TemporalConstraint,
  TemporalConstraintType,
  TemporalUrgency
} from '@/types/items'
import {
  cleanShoppingItemContent,
  detectShoppingCategory
} from '@/config/shopping-categories'

// ============================================
// TYPES INTERNES
// ============================================

interface OpenAIAnalysisResponse {
  items: Array<{
    content: string
    type: ItemType
    state: ItemState
    context?: ItemContext
    confidence: number
    extracted_data?: {
      date?: string
      time?: string
      location?: string
      items?: string[]
      category?: string
    }
    suggestions?: string[]
    reasoning?: string
    temporal_constraint?: {
      type: TemporalConstraintType
      date?: string
      start_date?: string
      end_date?: string
      urgency: TemporalUrgency
      raw_pattern?: string
    } | null
  }>
}

// ============================================
// PROMPTS
// ============================================

const SYSTEM_PROMPT = `Tu es un assistant d'organisation pour parents débordés.
Tu analyses des pensées capturées et les catégorises selon le nouveau schéma.

RÈGLES IMPORTANTES :
- TYPE = Nature de l'item (ce que c'est)
- STATE = Étape dans le cycle de vie (où ça en est)

Ne confonds JAMAIS type et state.`

function buildAnalysisPrompt(rawText: string, historyContext?: string): string {
  // Calculer la date actuelle pour le contexte temporel
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const dayOfWeek = today.toLocaleDateString('fr-FR', { weekday: 'long' })

  // Calculer les prochains jours de la semaine
  const weekDays: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const dayName = d.toLocaleDateString('fr-FR', { weekday: 'long' })
    const dateStr = d.toISOString().split('T')[0]
    weekDays.push(`${dayName} = ${dateStr}`)
  }

  return `Analyse cette pensée capturée et découpe-la en items distincts si nécessaire.

PENSÉE À ANALYSER :
"${rawText}"

CONTEXTE TEMPOREL :
- Aujourd'hui : ${todayStr} (${dayOfWeek})
- Demain : ${new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
- Jours de la semaine :
  ${weekDays.join('\n  ')}

${historyContext || ''}

Pour chaque item détecté, détermine :

1. TYPE (nature de la chose - IMMUTABLE) :
   - "task" : Action concrète à faire (ex: "Appeler le dentiste", "Prendre RDV")
   - "note" : Information/mémo à retenir (ex: "Léa adore les licornes", "Code WiFi: abc123")
   - "idea" : Envie floue, projet pas structuré (ex: "Partir au Japon", "Refaire la cuisine")
   - "list_item" : Article de courses → NETTOYER le contenu (voir règle LIST_ITEM ci-dessous)

2. STATE (étape cycle de vie - MUTABLE) :
   - "captured" : Vient d'être saisi, nécessite clarification
   - "active" : Clarifié, prêt à être utilisé

3. CONTEXT (domaine de vie) :
   - "personal" : Personnel
   - "family" : Famille/enfants
   - "work" : Professionnel
   - "health" : Santé

4. EXTRACTED DATA (si détectable) :
   - date : Si une date est mentionnée (format ISO)
   - time : Si une heure est mentionnée
   - location : Si un lieu est mentionné
   - items : Si plusieurs articles détectés (pour list_item)
   - category : Catégorie de l'article (pour list_item uniquement) parmi :
     "bakery" (pain, baguette, croissant)
     "dairy" (lait, yaourt, fromage, beurre, œufs)
     "meat" (poulet, bœuf, poisson, jambon)
     "produce" (fruits, légumes, tomates, carottes)
     "grocery" (pâtes, riz, conserves, sauce, sucre)
     "frozen" (surgelés, glaces)
     "hygiene" (savon, dentifrice, shampoing)
     "household" (lessive, éponge, sacs poubelle)
     "drinks" (eau, jus, café, thé, vin, bière)
     "other" (si aucune catégorie ne correspond)

5. TEMPORAL CONSTRAINT (contrainte temporelle - CRITIQUE pour la planification) :
   Détecte les indicateurs de QUAND la tâche doit être faite.

   TYPES DE CONTRAINTES :
   - "deadline" : Date limite → utilise "date" ("avant lundi", "au plus tard vendredi", "d'ici mardi", "avant demain 11h")
   - "fixed_date" : Jour précis → utilise "date" ("lundi", "mardi prochain", "le 15 janvier", "réunion mardi 14h", "jeudi à 10h")
   - "start_date" : Date de début → utilise "start_date" ("à partir de mardi", "après le 10", "dès lundi")
   - "time_range" : Période avec début ET fin → utilise "start_date" ET "end_date" ("entre lundi et mercredi", "cette semaine", "du 5 au 10")
   - "asap" : Urgent ("urgent", "dès que possible", "asap", "au plus vite", "rapidement")

   URGENCE :
   - "critical" : urgent/asap/au plus vite
   - "high" : deadline proche (< 3 jours)
   - "medium" : contrainte normale
   - "low" : contrainte souple

   FORMAT DATE AVEC HEURE OU MOMENT DE LA JOURNÉE :
   ⚠️ RÈGLE ABSOLUE : Si une HEURE ou un MOMENT DE JOURNÉE est mentionné, tu DOIS OBLIGATOIREMENT l'inclure dans "date" au format ISO complet avec l'heure : "YYYY-MM-DDTHH:MM:00"

   NE JAMAIS retourner "date": "2025-12-30" si l'utilisateur a dit "lundi après-midi" !
   Tu DOIS retourner "date": "2025-12-30T14:00:00" avec le T et l'heure !

   Heures explicites :
   - "avant demain 11h" → date: "2025-12-28T11:00:00"
   - "réunion mardi 14h" → date: "2025-12-30T14:00:00"

   MOMENTS DE LA JOURNÉE → TOUJOURS CONVERTIR EN HEURE DANS LE CHAMP DATE :
   - "matin" → ajoute T09:00:00 à la date
   - "fin de matinée" → ajoute T11:00:00 à la date
   - "midi" → ajoute T12:00:00 à la date
   - "après-midi" → ajoute T14:00:00 à la date (OBLIGATOIRE !)
   - "fin d'après-midi" → ajoute T17:00:00 à la date
   - "soir" → ajoute T19:00:00 à la date

   EXEMPLES CONCRETS (utilise les dates exactes du CONTEXTE TEMPOREL) :
   - "aller à la pharmacie lundi après-midi" → fixed_date, date: "2025-12-30T14:00:00", raw_pattern: "lundi après-midi"
   - "mardi après-midi" → fixed_date, date: "2025-12-30T14:00:00", raw_pattern: "mardi après-midi"
   - "jeudi matin" → fixed_date, date: "2026-01-01T09:00:00", raw_pattern: "jeudi matin"
   - "demain soir" → fixed_date, date: "2025-12-28T19:00:00", raw_pattern: "demain soir"
   - "avant lundi" (SANS moment de journée) → deadline, date: "2025-12-30" (date simple OK ici seulement)

   EXEMPLES DE DÉTECTION (utilise les dates du CONTEXTE TEMPOREL ci-dessus) :
   - "Appeler le pédiatre avant lundi" → deadline, date: [date du lundi], urgency: high
   - "Appeler tati avant demain 11h" → deadline, date: "[demain]T11:00:00", urgency: high
   - "Urgent envoyer devis client" → asap, urgency: critical
   - "Réunion mardi 14h" → fixed_date, date: "[mardi]T14:00:00", urgency: medium
   - "Réunion jeudi à 10h" → fixed_date, date: "[jeudi]T10:00:00", urgency: medium
   - "RDV pédiatre jeudi" → fixed_date, date: "[jeudi]", urgency: medium
   - "À partir de lundi, relancer le dossier" → start_date, start_date: "[lundi]", urgency: medium
   - "Entre lundi et mercredi" → time_range, start_date: "[lundi]", end_date: "[mercredi]", urgency: medium
   - "Finir le rapport cette semaine" → time_range, start_date: "[aujourd'hui]", end_date: "[dimanche]", urgency: medium

RÈGLES CRITIQUES :
- Si c'est une envie future sans action claire → type: "idea", state: "captured"
- Si c'est actionnable maintenant → type: "task", state: "active"
- Si c'est une info à retenir (pas d'action) → type: "note", state: "active"
- Si ce sont des courses/achats → type: "list_item", state: "active"
- Si "lait pain œufs" ou liste séparée par espaces/virgules → DÉCOUPER en plusieurs list_item
- confidence : 0.0 à 1.0 (certitude de la classification)
- temporal_constraint : null si aucune contrainte temporelle détectée

⚠️ RÈGLE LIST_ITEM (TRÈS IMPORTANTE) :
Pour CHAQUE article de courses, tu DOIS NETTOYER le content :
1. D'abord DÉCOUPER la liste par virgules ou "et"
2. Puis pour CHAQUE article obtenu :
   - Supprimer les verbes : "acheter", "prendre", "il faut", "il me faut", "je dois acheter"
   - Supprimer les articles : "du", "de la", "des", "de l'", "le", "la", "les", "un", "une"
   - Mettre une majuscule au début
   - Garder les qualificatifs importants (ex: "farine complète" → "Farine complète")

EXEMPLES LIST_ITEM (SUIVRE EXACTEMENT CE FORMAT) :
- "Acheter du lait" → 1 item : content: "Lait", category: "dairy"
- "Il me faut de la farine" → 1 item : content: "Farine", category: "bakery"
- "Prendre des œufs" → 1 item : content: "Œufs", category: "dairy"
- "acheter du pain, des oeufs et de la farine complète" → 3 items :
  ✓ content: "Pain", category: "bakery" (PAS "acheter du pain")
  ✓ content: "Oeufs", category: "dairy" (PAS "des oeufs")
  ✓ content: "Farine complète", category: "bakery" (PAS "de la farine complète")
- "Pain beurre confiture" → 3 items : "Pain" (bakery), "Beurre" (dairy), "Confiture" (grocery)

EXEMPLES AUTRES TYPES :
- "Aller au ski en février 2027" → type: "idea", state: "captured", temporal_constraint: null
- "Appeler le plombier demain" → type: "task", temporal_constraint: { type: "fixed_date", date: demain, urgency: "medium" }
- "Urgent: rappeler client" → type: "task", temporal_constraint: { type: "asap", urgency: "critical" }

Réponds UNIQUEMENT en JSON valide, sans markdown :
{
  "items": [
    {
      "content": "texte ORIGINAL COMPLET (ne jamais tronquer ni supprimer les infos temporelles)",
      "type": "task" | "note" | "idea" | "list_item",
      "state": "captured" | "active",
      "context": "personal" | "family" | "work" | "health",
      "confidence": 0.0-1.0,
      "extracted_data": {
        "date": "ISO 8601" ou null,
        "time": "HH:mm" ou null,
        "location": "string" ou null,
        "items": ["item1", "item2"] ou null,
        "category": "bakery|dairy|meat|produce|grocery|frozen|hygiene|household|drinks|other" ou null
      },
      "temporal_constraint": {
        "type": "deadline" | "fixed_date" | "start_date" | "time_range" | "asap",
        "date": "ISO 8601" ou null,
        "start_date": "ISO 8601" ou null,
        "end_date": "ISO 8601" ou null,
        "urgency": "critical" | "high" | "medium" | "low",
        "raw_pattern": "expression originale détectée"
      } ou null,
      "suggestions": ["suggestion1", "suggestion2"],
      "reasoning": "explication courte du choix"
    }
  ]
}`
}

// ============================================
// ANALYSE IA (via API route)
// ============================================

export async function analyzeCapture(rawText: string): Promise<AIAnalysisResult> {
  const response = await fetch('/api/analyze-v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Analysis failed')
  }

  return response.json()
}

// ============================================
// ANALYSE FALLBACK (règles basiques)
// ============================================

export function analyzeWithRules(rawText: string): AIAnalysisResult {
  const lowerText = rawText.toLowerCase().trim()
  const items: AIAnalyzedItem[] = []

  // Détection courses - mots-clés ou pattern "mot mot mot" courts
  const groceryKeywords = ['acheter', 'courses', 'supermarché', 'magasin']
  const commonGroceryItems = ['lait', 'pain', 'œufs', 'oeufs', 'beurre', 'fromage', 'eau', 'café', 'thé', 'sucre', 'sel', 'huile', 'pâtes', 'riz', 'viande', 'poulet', 'légumes', 'fruits', 'yaourt', 'jambon']

  const isGroceryContext = groceryKeywords.some(kw => lowerText.includes(kw))
  const words = rawText.split(/[\s,]+/).filter(w => w.length > 1)
  const groceryWordsFound = words.filter(w =>
    commonGroceryItems.includes(w.toLowerCase())
  )

  // Si plusieurs mots de courses détectés ou contexte courses explicite
  if (groceryWordsFound.length >= 2 || (isGroceryContext && groceryWordsFound.length >= 1)) {
    // Découper en list_items
    const itemsToAdd = groceryWordsFound.length > 0 ? groceryWordsFound : words.slice(0, 5)

    for (const item of itemsToAdd) {
      // Nettoyer et détecter la catégorie
      const cleanedContent = cleanShoppingItemContent(item)
      const category = detectShoppingCategory(item)

      items.push({
        content: cleanedContent,
        type: 'list_item',
        state: 'active',
        context: 'family',
        ai_analysis: {
          type_suggestion: 'list_item',
          confidence: 0.7,
          extracted_data: { items: [item], category },
          suggestions: ['Ajouter à la liste de courses']
        }
      })
    }

    return { items, raw_input: rawText }
  }

  // Cas spécial : "acheter du X" → nettoyer et créer un list_item
  if (isGroceryContext) {
    const cleanedContent = cleanShoppingItemContent(rawText)
    const category = detectShoppingCategory(cleanedContent)

    items.push({
      content: cleanedContent,
      type: 'list_item',
      state: 'active',
      context: 'family',
      ai_analysis: {
        type_suggestion: 'list_item',
        confidence: 0.7,
        extracted_data: { category },
        suggestions: ['Ajouter à la liste de courses']
      }
    })

    return { items, raw_input: rawText }
  }

  // Détection note (info à retenir)
  const notePatterns = [
    /aime/i, /adore/i, /déteste/i, /allergique/i,
    /code/i, /mot de passe/i, /numéro/i, /adresse/i,
    /anniversaire/i, /né le/i
  ]

  if (notePatterns.some(p => p.test(lowerText))) {
    items.push({
      content: rawText,
      type: 'note',
      state: 'active',
      context: 'family',
      ai_analysis: {
        type_suggestion: 'note',
        confidence: 0.8,
        extracted_data: {},
        suggestions: ['Information enregistrée']
      }
    })

    return { items, raw_input: rawText }
  }

  // Détection idée (projet futur)
  const ideaPatterns = [
    /envie de/i, /j'aimerais/i, /on pourrait/i, /ce serait bien de/i,
    /un jour/i, /plus tard/i, /projet/i, /rêve de/i,
    /en 202[5-9]/i, /l'année prochaine/i, /cet été/i, /ces vacances/i
  ]

  if (ideaPatterns.some(p => p.test(lowerText))) {
    items.push({
      content: rawText,
      type: 'idea',
      state: 'captured',
      context: 'personal',
      ai_analysis: {
        type_suggestion: 'idea',
        confidence: 0.7,
        extracted_data: {},
        suggestions: ['Cette idée peut être développée en projet']
      }
    })

    return { items, raw_input: rawText }
  }

  // Détection task par verbes d'action
  const actionVerbs = [
    /^appeler/i, /^téléphoner/i, /^contacter/i,
    /^prendre rdv/i, /^réserver/i, /^commander/i,
    /^envoyer/i, /^écrire/i, /^faire/i,
    /^aller/i, /^passer/i, /^chercher/i,
    /^rappeler/i, /^relancer/i
  ]

  if (actionVerbs.some(p => p.test(lowerText))) {
    items.push({
      content: rawText,
      type: 'task',
      state: 'active',
      context: 'personal',
      ai_analysis: {
        type_suggestion: 'task',
        confidence: 0.8,
        extracted_data: {},
        suggestions: ['Tâche prête à être planifiée']
      }
    })

    return { items, raw_input: rawText }
  }

  // Découpage par virgules/points si plusieurs segments
  const segments = rawText
    .split(/[,;]|\.(?!\d)/)
    .map(s => s.trim())
    .filter(s => s.length > 3)

  if (segments.length > 1) {
    for (const segment of segments) {
      items.push({
        content: segment,
        type: 'task',
        state: 'captured',
        context: 'personal',
        ai_analysis: {
          type_suggestion: 'task',
          confidence: 0.5,
          extracted_data: {},
          suggestions: ['À clarifier']
        }
      })
    }

    return { items, raw_input: rawText }
  }

  // Fallback : task captured
  items.push({
    content: rawText,
    type: 'task',
    state: 'captured',
    context: 'personal',
    ai_analysis: {
      type_suggestion: 'task',
      confidence: 0.4,
      extracted_data: {},
      suggestions: ['Type à confirmer']
    }
  })

  return { items, raw_input: rawText }
}

// ============================================
// EXPORTS PROMPTS (pour API route)
// ============================================

export { SYSTEM_PROMPT, buildAnalysisPrompt }
export type { OpenAIAnalysisResponse }
