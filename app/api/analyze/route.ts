import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import type { ItemType, ItemContext } from '@/types/items'

// Type pour la réponse de l'API
interface AnalyzedItem {
  content: string
  type: ItemType
  context?: ItemContext
  confidence: number
  extracted_data: {
    date?: string
    time?: string
    location?: string
    items?: string[]
  }
  suggestions: string[]
}

export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier auth
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Récupérer le texte à analyser depuis le body (ou les items captured)
    const body = await request.json().catch(() => ({}))
    let textsToAnalyze: string[] = []

    if (body.rawText) {
      // Nouveau mode : texte brut passé directement
      textsToAnalyze = [body.rawText]
    } else {
      // Mode legacy : récupérer les items captured
      const { data: capturedItems, error: itemsError } = await supabase
        .from('items')
        .select('id, content')
        .eq('user_id', user.id)
        .eq('state', 'captured')
        .order('created_at', { ascending: true })

      if (itemsError) throw itemsError

      if (!capturedItems || capturedItems.length === 0) {
        return NextResponse.json({
          error: 'No items to analyze'
        }, { status: 400 })
      }

      textsToAnalyze = capturedItems.map(item => item.content)
    }

    // 3. Vérifier si OpenAI est configuré
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured, using rule-based analysis')
      const fallbackItems = textsToAnalyze.flatMap(text => analyzeWithRules(text))
      return NextResponse.json({
        items: fallbackItems,
        warning: 'Analyse simplifiée (IA non configurée)'
      })
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // 4. Récupérer contexte historique
    const { data: pastItems } = await supabase
      .from('items')
      .select('content, type, context')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    const historyContext = pastItems && pastItems.length > 0
      ? `Historique récent : ${pastItems.map(i => `"${i.content}" → ${i.type}/${i.context}`).join(', ')}`
      : ''

    // 5. Construire prompt
    const textsFormatted = textsToAnalyze.map(t => `- ${t}`).join('\n')

    const prompt = `Tu es un assistant d'organisation pour parents débordés.

Analyse ces pensées capturées et découpe-les en items distincts si nécessaire.

PENSÉES À ANALYSER :
${textsFormatted}

${historyContext}

Pour chaque item détecté, détermine :

1. TYPE (nature de la chose - IMMUTABLE) :
   - "task" : Action concrète à faire (ex: "Appeler le dentiste", "Prendre RDV")
   - "note" : Information/mémo à retenir (ex: "Léa adore les licornes", "Code WiFi: abc123")
   - "idea" : Envie floue, projet pas structuré (ex: "Partir au Japon", "Refaire la cuisine")
   - "list_item" : Article de courses (ex: "lait", "pain", "œufs")

2. CONTEXT (domaine de vie) :
   - "personal" : Personnel
   - "family" : Famille/enfants
   - "work" : Professionnel
   - "health" : Santé

3. EXTRACTED DATA (si détectable) :
   - date : Si une date est mentionnée (format ISO)
   - time : Si une heure est mentionnée
   - location : Si un lieu est mentionné
   - items : Si plusieurs articles détectés (pour list_item)

4. CONFIDENCE : 0.0 à 1.0 (certitude de la classification)

5. SUGGESTIONS : Conseils pour l'utilisateur

RÈGLES CRITIQUES :
- Si "lait pain œufs" ou liste séparée par espaces/virgules → DÉCOUPER en plusieurs list_item
- Si envie future sans action claire → type: "idea"
- Si actionnable maintenant → type: "task"
- Si info à retenir (pas d'action) → type: "note"

Réponds UNIQUEMENT en JSON valide, sans markdown :
{
  "items": [
    {
      "content": "texte reformulé si nécessaire",
      "type": "task" | "note" | "idea" | "list_item",
      "context": "personal" | "family" | "work" | "health",
      "confidence": 0.0-1.0,
      "extracted_data": {
        "date": "ISO 8601" ou null,
        "time": "HH:mm" ou null,
        "location": "string" ou null,
        "items": ["item1", "item2"] ou null
      },
      "suggestions": ["suggestion1", "suggestion2"]
    }
  ]
}`

    // 6. Appel OpenAI avec retry
    let completion
    let retries = 0
    const maxRetries = 2

    while (retries <= maxRetries) {
      try {
        completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Tu es un assistant expert en organisation et productivité. Tu réponds toujours en JSON valide.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.5,
          max_tokens: 2000
        })
        break
      } catch (error: unknown) {
        const err = error as { status?: number }
        if (err.status === 429 && retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 30000))
          retries++
        } else {
          throw error
        }
      }
    }

    if (!completion) {
      throw new Error('Failed to get completion after retries')
    }

    // 7. Parser réponse IA
    const content = completion.choices[0].message.content || ''
    const cleanContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    let aiResponse
    try {
      aiResponse = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('Failed to parse AI response:', cleanContent)
      // Fallback sur règles basiques
      const fallbackItems = textsToAnalyze.flatMap(text => analyzeWithRules(text))
      return NextResponse.json({
        items: fallbackItems,
        warning: 'Analyse simplifiée (réponse IA invalide)'
      })
    }

    // 8. Valider et retourner les items
    const validatedItems: AnalyzedItem[] = aiResponse.items.map((item: AnalyzedItem) => ({
      content: item.content,
      type: validateType(item.type),
      context: item.context || 'personal',
      confidence: item.confidence || 0.8,
      extracted_data: item.extracted_data || {},
      suggestions: item.suggestions || []
    }))

    return NextResponse.json({
      items: validatedItems,
      raw_input: textsToAnalyze.join(' | ')
    })

  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error('Analysis error:', error)

    return NextResponse.json(
      { error: err.message || 'Analysis failed' },
      { status: 500 }
    )
  }
}

// Valider que le type est correct
function validateType(type: string): ItemType {
  const validTypes: ItemType[] = ['task', 'note', 'idea', 'list_item']
  if (validTypes.includes(type as ItemType)) {
    return type as ItemType
  }
  return 'task' // Fallback
}

// Analyse basique par règles
function analyzeWithRules(text: string): AnalyzedItem[] {
  const lowerText = text.toLowerCase().trim()
  const items: AnalyzedItem[] = []

  // Détection courses
  const groceryKeywords = ['acheter', 'courses', 'supermarché', 'magasin']
  const commonGroceryItems = ['lait', 'pain', 'œufs', 'oeufs', 'beurre', 'fromage', 'eau', 'café', 'thé', 'sucre', 'sel', 'huile', 'pâtes', 'riz', 'viande', 'poulet', 'légumes', 'fruits', 'yaourt', 'jambon']

  const isGroceryContext = groceryKeywords.some(kw => lowerText.includes(kw))
  const words = text.split(/[\s,]+/).filter(w => w.length > 1)
  const groceryWordsFound = words.filter(w =>
    commonGroceryItems.includes(w.toLowerCase())
  )

  if (groceryWordsFound.length >= 2 || (isGroceryContext && groceryWordsFound.length >= 1)) {
    const itemsToAdd = groceryWordsFound.length > 0 ? groceryWordsFound : words.slice(0, 5)

    for (const item of itemsToAdd) {
      items.push({
        content: item.charAt(0).toUpperCase() + item.slice(1).toLowerCase(),
        type: 'list_item',
        context: 'family',
        confidence: 0.7,
        extracted_data: { items: [item] },
        suggestions: ['Ajouter à la liste de courses']
      })
    }

    return items
  }

  // Détection note
  const notePatterns = [/aime/i, /adore/i, /déteste/i, /allergique/i, /code/i, /mot de passe/i, /numéro/i, /adresse/i, /anniversaire/i, /né le/i]

  if (notePatterns.some(p => p.test(lowerText))) {
    items.push({
      content: text,
      type: 'note',
      context: 'family',
      confidence: 0.8,
      extracted_data: {},
      suggestions: ['Information enregistrée']
    })
    return items
  }

  // Détection idée
  const ideaPatterns = [/envie de/i, /j'aimerais/i, /on pourrait/i, /ce serait bien de/i, /un jour/i, /plus tard/i, /projet/i, /rêve de/i, /en 202[5-9]/i, /l'année prochaine/i, /cet été/i, /ces vacances/i]

  if (ideaPatterns.some(p => p.test(lowerText))) {
    items.push({
      content: text,
      type: 'idea',
      context: 'personal',
      confidence: 0.7,
      extracted_data: {},
      suggestions: ['Cette idée peut être développée en projet']
    })
    return items
  }

  // Détection task par verbes d'action
  const actionVerbs = [/^appeler/i, /^téléphoner/i, /^contacter/i, /^prendre rdv/i, /^réserver/i, /^commander/i, /^envoyer/i, /^écrire/i, /^faire/i, /^aller/i, /^passer/i, /^chercher/i, /^rappeler/i, /^relancer/i]

  if (actionVerbs.some(p => p.test(lowerText))) {
    items.push({
      content: text,
      type: 'task',
      context: 'personal',
      confidence: 0.8,
      extracted_data: {},
      suggestions: ['Tâche prête à être planifiée']
    })
    return items
  }

  // Fallback : task
  items.push({
    content: text,
    type: 'task',
    context: 'personal',
    confidence: 0.5,
    extracted_data: {},
    suggestions: ['Type à confirmer']
  })

  return items
}
