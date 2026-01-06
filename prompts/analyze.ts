/**
 * Prompt d'analyse des pensées capturées
 * Approche "few-shot" : exemples concrets plutôt que longues règles
 */

import { ANALYSIS_SYSTEM } from './system'
import type { PromptConfig, AnalysisContext } from './types'

// ============================================
// CONFIGURATION
// ============================================

export const ANALYZE_CONFIG: PromptConfig = {
  system: ANALYSIS_SYSTEM,
  temperature: 0.2,
  maxTokens: 1500,
  model: 'gpt-4o-mini'
}

// ============================================
// EXEMPLES FEW-SHOT
// ============================================

const EXAMPLES = `
EXEMPLES (entrée → sortie attendue) :

1. TÂCHES (actions concrètes) - GARDER LE CONTENU ORIGINAL
⚠️ Ne PAS nettoyer le contenu des tâches. Garder les infos temporelles dans le texte.

TEMPORAL_CONSTRAINT - RÈGLES IMPORTANTES :
- "[jour] [heure]" ou "à [heure]" → type: "fixed_date" (RDV précis à cette heure)
- "[jour] avant [heure]" → type: "time_range" avec start_date=[jour]T08:00 et end_date=[jour]T[heure] (CE jour, avant l'heure)
- "[jour] matin" → type: "time_range" avec start_date=[jour]T08:00 et end_date=[jour]T12:00 (CE jour, le matin)
- "[jour] après-midi" → type: "time_range" avec start_date=[jour]T14:00 et end_date=[jour]T18:00 (CE jour, l'après-midi)
- "avant [jour]" (sans heure) → type: "deadline" (n'importe quand avant ce jour)
- "urgent", "asap" ou "vite" → type: "asap"
- "à partir de [jour]" → type: "start_date" (créneaux CE jour et après)
- "[action] [jour]" (sans heure) → type: "fixed_date" (créneaux CE jour uniquement)
⚠️ EXPRESSIONS SPÉCIALES (PRIORITAIRES) :
- "fin du mois", "fin de mois", "à la fin du mois" → type: "deadline" avec date = FIN DU MOIS (voir ci-dessous)
- "début du mois prochain", "début de mois" → type: "fixed_date" avec date = DÉBUT MOIS PROCHAIN (voir ci-dessous)

"Appeler le dentiste" → { content: "Appeler le dentiste", type: "task", state: "active", context: "health" }
"Appeler le dentiste demain" → { content: "Appeler le dentiste demain", type: "task", state: "active", context: "health", temporal_constraint: { type: "fixed_date", date: "[demain]" } }
"Réunion mardi 14h" → { content: "Réunion mardi 14h", type: "task", state: "active", context: "work", temporal_constraint: { type: "fixed_date", date: "[mardi]T14:00:00" } }
"Réunion mardi avant 14h" → { content: "Réunion mardi avant 14h", type: "task", state: "active", context: "work", temporal_constraint: { type: "time_range", start_date: "[mardi]T08:00:00", end_date: "[mardi]T14:00:00", raw_pattern: "mardi avant 14h" } }
"Appeler comptable lundi matin" → { content: "Appeler comptable lundi matin", type: "task", state: "active", context: "work", temporal_constraint: { type: "time_range", start_date: "[lundi]T08:00:00", end_date: "[lundi]T12:00:00", raw_pattern: "lundi matin" } }
"RDV banque jeudi après-midi" → { content: "RDV banque jeudi après-midi", type: "task", temporal_constraint: { type: "time_range", start_date: "[jeudi]T14:00:00", end_date: "[jeudi]T18:00:00", raw_pattern: "jeudi après-midi" } }
"Finir rapport avant vendredi" → { content: "Finir rapport avant vendredi", type: "task", state: "active", temporal_constraint: { type: "deadline", date: "[vendredi]", urgency: "high" } }
"Payer facture avant le 15" → { content: "Payer facture avant le 15", type: "task", temporal_constraint: { type: "deadline", date: "[15 du mois]", urgency: "medium" } }
"Urgent rappeler client" → { content: "Urgent rappeler client", type: "task", state: "active", context: "work", temporal_constraint: { type: "asap", urgency: "critical" } }
"Vite répondre au mail" → { content: "Vite répondre au mail", type: "task", state: "active", temporal_constraint: { type: "asap", urgency: "high" } }
"Commencer régime lundi" → { content: "Commencer régime lundi", type: "task", state: "active", context: "health", temporal_constraint: { type: "fixed_date", date: "[lundi]" } }
"Reprendre sport à partir de mardi" → { content: "Reprendre sport à partir de mardi", type: "task", state: "active", context: "health", temporal_constraint: { type: "start_date", start_date: "[mardi]T00:00:00" } }
⚠️ "Appeler EDF fin du mois" → { content: "Appeler EDF fin du mois", type: "task", state: "active", context: "other", temporal_constraint: { type: "deadline", date: "UTILISER LA DATE FIN DU MOIS INDIQUÉE CI-DESSOUS", urgency: "low", raw_pattern: "fin du mois" } }
⚠️ "Payer loyer début du mois prochain" → { content: "Payer loyer début du mois prochain", type: "task", state: "active", context: "other", temporal_constraint: { type: "fixed_date", date: "UTILISER LA DATE DÉBUT MOIS PROCHAIN INDIQUÉE CI-DESSOUS", raw_pattern: "début du mois prochain" } }
"Appeler dentiste et pédiatre" → 2 items : { content: "Appeler le dentiste" } + { content: "Appeler le pédiatre" }

2. NOTES (infos à retenir, pas d'action) - GARDER LE CONTENU ORIGINAL
"Léa adore les licornes" → { content: "Léa adore les licornes", type: "note", state: "active", context: "family" }
"Code WiFi: abc123" → { content: "Code WiFi: abc123", type: "note", state: "active", context: "other" }
"Emma allergique aux arachides" → { content: "Emma allergique aux arachides", type: "note", state: "active", context: "family" }

3. IDÉES (projets futurs flous) - GARDER LE CONTENU ORIGINAL
"Partir au Japon un jour" → { content: "Partir au Japon un jour", type: "idea", state: "captured", context: "personal" }
"Refaire la cuisine" → { content: "Refaire la cuisine", type: "idea", state: "captured", context: "personal" }
"Aller au ski en février 2027" → { content: "Aller au ski en février 2027", type: "idea", state: "captured", context: "personal" }

4. COURSES (list_item) - NETTOYER le contenu + CATÉGORISER

CATÉGORIES (OBLIGATOIRE pour list_item) :
- bakery : pain, farine, brioche, croissant, pain de mie
- dairy : lait, œufs, fromage, beurre, yaourt, crème
- meat : viande, poisson, jambon, poulet, saucisse, lardons, steaks
- produce : fruits, légumes, banane, pomme, salade, compotes
- grocery : pâtes, riz, conserves, huile, sucre, sel, sauce
- frozen : surgelés, glace
- hygiene : savon, shampoing, dentifrice, PQ, sopalin
- household : lessive, liquide vaisselle, éponges
- drinks : eau, café, thé, jus, vin, bière
- baby : couches, lingettes, compotes bébé
- other : piles, ampoules, et tout le reste

⚠️ RÈGLE CRITIQUE - NETTOYAGE + CATÉGORIE OBLIGATOIRES :
Pour list_item : content = NOM DU PRODUIT SEULEMENT + extracted_data.category OBLIGATOIRE

EXEMPLES COMPLETS (format JSON attendu) :
"Ajouter à la liste de course du dentifrice" → { content: "Dentifrice", type: "list_item", state: "active", context: "other", extracted_data: { category: "hygiene" } }
"Acheter du lait" → { content: "Lait", type: "list_item", state: "active", context: "other", extracted_data: { category: "dairy" } }
"6 œufs" → { content: "6 œufs", type: "list_item", state: "active", context: "other", extracted_data: { category: "dairy" } }
"Pain" → { content: "Pain", type: "list_item", state: "active", context: "other", extracted_data: { category: "bakery" } }
"Jambon" → { content: "Jambon", type: "list_item", state: "active", context: "other", extracted_data: { category: "meat" } }
"Bananes" → { content: "Bananes", type: "list_item", state: "active", context: "other", extracted_data: { category: "produce" } }
"Pâtes" → { content: "Pâtes", type: "list_item", state: "active", context: "other", extracted_data: { category: "grocery" } }
"Piles" → { content: "Piles", type: "list_item", state: "active", context: "other", extracted_data: { category: "other" } }

LISTE BRUTE (mots séparés) :
"lait oeufs pain" → 3 items avec leurs catégories respectives (dairy, dairy, bakery)
"bananes pommes compotes" → 3 items (produce, produce, produce)

AVEC QUANTITÉS :
"2 briques de lait" → { content: "2 briques de lait", extracted_data: { category: "dairy" } }
"500g farine" → { content: "500g farine", extracted_data: { category: "bakery" } }

PRODUITS COMPOSÉS (garder ensemble) :
"yaourt au citron" → { content: "Yaourt au citron", extracted_data: { category: "dairy" } }
"jus de pomme" → { content: "Jus de pomme", extracted_data: { category: "drinks" } }
"huile d'olive" → { content: "Huile d'olive", extracted_data: { category: "grocery" } }
"sauce tomate" → { content: "Sauce tomate", extracted_data: { category: "grocery" } }

MIX COURSES + TÂCHE :
"lait pain et appeler nounou" → 3 items :
  - { content: "Lait", type: "list_item", extracted_data: { category: "dairy" } }
  - { content: "Pain", type: "list_item", extracted_data: { category: "bakery" } }
  - { content: "Appeler nounou", type: "task" }
`

// ============================================
// RÈGLES CONCISES
// ============================================

const RULES = `
RÈGLES :
1. TYPE : task (action), note (info), idea (projet flou), list_item (courses alimentaires/ménage)
2. STATE : "active" si clair, "captured" si flou (ideas uniquement)
3. CONTEXT : health (médical), family (enfants), work (pro), personal (perso), other
4. DÉCOUPAGE : séparer si virgules/et avec entités différentes
5. COURSES : TOUJOURS nettoyer (supprimer "acheter du/de la/des", garder le produit)
6. TEMPORAL : détecter dates, heures, urgences

TASK vs IDEA :
- task = action simple, planifiable en 1 étape (RDV, appel, achat spécifique)
- idea = projet nécessitant réflexion, organisation, plusieurs étapes

Exemples :
- "Inscrire Léo au foot" → task (1 action : téléphoner/s'inscrire en ligne)
- "Organiser anniversaire Léo" → idea (plusieurs étapes : lieu, invités, gâteau...)
- "Acheter chaussures Emma" → task (1 action : aller au magasin)
- "Refaire la chambre des enfants" → idea (peinture, meubles, déco...)

TASK vs LIST_ITEM :
- list_item = produits alimentaires, ménagers, hygiène (liste de courses)
- task = achats spécifiques avec contexte (vêtements, équipement, cadeaux)

Exemples :
- "Acheter du lait" → list_item (course alimentaire)
- "Acheter des chaussures pour Emma" → task (achat contextuel enfant)
- "Acheter cadeau anniversaire Théo" → task (achat contextuel événement)
`

// ============================================
// FORMAT JSON
// ============================================

const JSON_FORMAT = `
FORMAT JSON (strict) :
{
  "items": [{
    "content": "⚠️ RÈGLE IMPORTANTE :
      - task/note/idea → CONTENU ORIGINAL (ne pas modifier, garder dates/heures dans le texte)
      - list_item → PRODUIT SEULEMENT (nettoyer verbes et phrases)",
    "type": "task|note|idea|list_item",
    "state": "active|captured",
    "context": "personal|family|work|health|other",
    "confidence": 0.0-1.0,
    "extracted_data": {
      "category": "pour list_item uniquement (bakery, dairy, meat, etc.)"
    },
    "temporal_constraint": {
      "type": "deadline|fixed_date|start_date|time_range|asap",
      "date": "ISO (pour deadline/fixed_date)",
      "start_date": "ISO (pour start_date/time_range)",
      "end_date": "ISO (pour time_range)",
      "urgency": "critical|high|medium|low",
      "raw_pattern": "expression originale"
    } ou null
  }]
}
`

// ============================================
// BUILDER
// ============================================

/**
 * Construit le prompt d'analyse complet
 */
export function buildAnalyzePrompt(context: AnalysisContext): string {
  const { rawText, today, historyContext } = context

  // Calculer les dates de référence
  const todayStr = today.toISOString().split('T')[0]
  const dayOfWeek = today.toLocaleDateString('fr-FR', { weekday: 'long' })
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Fin du mois en cours
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const endOfMonthStr = endOfMonth.toISOString().split('T')[0]

  // Début du mois prochain
  const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const startOfNextMonthStr = startOfNextMonth.toISOString().split('T')[0]

  // Jours de la semaine pour référence
  const weekDays: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    weekDays.push(`${d.toLocaleDateString('fr-FR', { weekday: 'long' })} = ${d.toISOString().split('T')[0]}`)
  }

  return `Analyse cette pensée et structure-la.

PENSÉE : "${rawText}"

DATES DE RÉFÉRENCE :
- AUJOURD'HUI : ${todayStr} (${dayOfWeek})
- DEMAIN : ${tomorrow.toISOString().split('T')[0]}
- JOURS : ${weekDays.join(', ')}
- FIN DU MOIS : ${endOfMonthStr} ← UTILISER CETTE DATE si "fin du mois" ou "fin de mois"
- DÉBUT MOIS PROCHAIN : ${startOfNextMonthStr} ← UTILISER CETTE DATE si "début du mois prochain"

⚠️ RÈGLE CRITIQUE : Si la pensée contient "fin du mois" ou "fin de mois", alors temporal_constraint.date = "${endOfMonthStr}"

${historyContext ? `HISTORIQUE : ${historyContext}\n` : ''}
${RULES}
${EXAMPLES}
${JSON_FORMAT}`
}

// ============================================
// EXPORTS
// ============================================

export { ANALYSIS_SYSTEM as SYSTEM_PROMPT }
