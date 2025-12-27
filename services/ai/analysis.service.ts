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
   - "list_item" : Article de courses (ex: "lait", "pain", "œufs")

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
   ⚠️ CRITIQUE : Si une HEURE ou un MOMENT est mentionné, tu DOIS l'inclure dans "date" au format ISO complet : "YYYY-MM-DDTHH:MM:00"

   Heures explicites :
   - "avant demain 11h" → date: "2025-12-28T11:00:00"
   - "réunion mardi 14h" → date: "2025-12-31T14:00:00"

   Moments de la journée (CONVERTIR en heures) :
   - "matin" → T09:00:00
   - "fin de matinée" → T11:00:00
   - "midi" → T12:00:00
   - "après-midi" → T14:00:00
   - "fin d'après-midi" → T17:00:00
   - "soir" → T19:00:00

   Exemples concrets :
   - "aller à la pharmacie lundi après-midi" → fixed_date, date: "[lundi]T14:00:00"
   - "mardi après-midi" → fixed_date, date: "[mardi]T14:00:00"
   - "jeudi matin" → fixed_date, date: "[jeudi]T09:00:00"
   - "demain soir" → fixed_date, date: "[demain]T19:00:00"
   - "avant lundi" (sans moment) → deadline, date: "[lundi]" (date simple OK)

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

EXEMPLES :
- "Aller au ski en février 2027" → type: "idea", state: "captured", temporal_constraint: null
- "Acheter du lait" → type: "list_item", state: "active", temporal_constraint: null
- "Pain lait œufs" → 3 items type: "list_item"
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
        "items": ["item1", "item2"] ou null
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
      items.push({
        content: item.charAt(0).toUpperCase() + item.slice(1).toLowerCase(),
        type: 'list_item',
        state: 'active',
        context: 'family',
        ai_analysis: {
          type_suggestion: 'list_item',
          confidence: 0.7,
          extracted_data: { items: [item] },
          suggestions: ['Ajouter à la liste de courses']
        }
      })
    }

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
