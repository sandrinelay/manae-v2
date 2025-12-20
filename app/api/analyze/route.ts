import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

// ============================================
// TYPES
// ============================================

interface AnalyzeRequest {
  content: string
}

interface AnalyzeResponse {
  type_suggestion: 'task' | 'note' | 'idea' | 'list_item'
  confidence: number
  extracted_data: {
    date?: string
    time?: string
    duration?: number // minutes
    items?: string[] // Pour courses multiples
    category?: string // Pour courses : "fruits", "légumes", etc.
  }
  suggestions: string[]
}

// ============================================
// API ROUTE
// ============================================

export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier configuration OpenAI
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured')
      // Retourner fallback au lieu d'erreur
      const body = await request.json().catch(() => ({ content: '' }))
      const fallback = basicAnalysis(body.content || '')
      return NextResponse.json(fallback)
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // 2. Vérifier authentification
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3. Parser le body
    const { content }: AnalyzeRequest = await request.json()

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // 4. Construire le prompt
    const prompt = `Tu es un assistant d'organisation pour parents débordés.

Analyse cette pensée capturée et détermine son type :

PENSÉE : "${content}"

TYPES POSSIBLES :
1. "task" : Action concrète à faire
   Exemples : "Appeler pédiatre pour Milo", "Réserver table restaurant samedi"

2. "note" : Information à retenir (pas d'action)
   Exemples : "Code wifi : ABC123", "Léa allergique aux arachides"

3. "idea" : Projet abstrait à développer
   Exemples : "Partir au Cambodge en 2027", "Refaire la déco du salon"

4. "list_item" : Article(s) de courses
   Exemples : "Lait", "Oeufs, farine, sucre"

DONNÉES À EXTRAIRE :
- Si date/heure mentionnée : extraire au format ISO
- Si durée mentionnée : extraire en minutes
- Si courses multiples : découper en liste
- Si courses : deviner catégorie (fruits, légumes, produits laitiers, etc.)

RÈGLES :
- Si contient un verbe d'action ET pas abstrait → task
- Si info factuelle sans action → note
- Si projet vague/lointain → idea
- Si mot-clé achat (acheter, lait, pain, etc.) → list_item
- Confiance haute (0.9+) si évident, moyenne (0.6-0.8) si ambigu

Réponds UNIQUEMENT en JSON valide, sans markdown :
{
  "type_suggestion": "task" | "note" | "idea" | "list_item",
  "confidence": 0.95,
  "extracted_data": {
    "date": "2025-12-25" ou null,
    "time": "14:30" ou null,
    "duration": 30 ou null,
    "items": ["item1", "item2"] ou null,
    "category": "fruits" ou null
  },
  "suggestions": [
    "Conseil pertinent 1",
    "Conseil pertinent 2"
  ]
}`

    // 5. Appeler OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert en organisation et productivité. Tu réponds toujours en JSON valide.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })

    // 6. Parser la réponse
    const responseContent = completion.choices[0].message.content || ''

    // Nettoyer markdown si présent
    const cleanContent = responseContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    let aiResponse: AnalyzeResponse
    try {
      aiResponse = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', cleanContent)

      // Fallback : analyse basique
      const fallback = basicAnalysis(content)
      return NextResponse.json(fallback)
    }

    // 7. Valider la réponse
    if (!['task', 'note', 'idea', 'list_item'].includes(aiResponse.type_suggestion)) {
      console.error('Invalid type from AI:', aiResponse.type_suggestion)
      const fallback = basicAnalysis(content)
      return NextResponse.json(fallback)
    }

    // 8. Retourner le résultat
    return NextResponse.json(aiResponse)

  } catch (error) {
    console.error('Analysis error:', error)

    // En cas d'erreur, retourner fallback
    try {
      const body = await request.clone().json()
      const fallback = basicAnalysis(body.content || '')
      return NextResponse.json(fallback)
    } catch {
      return NextResponse.json(
        { error: 'Analysis failed' },
        { status: 500 }
      )
    }
  }
}

// ============================================
// FALLBACK : Analyse basique sans IA
// ============================================

function basicAnalysis(content: string): AnalyzeResponse {
  const lowerContent = content.toLowerCase()

  // Détection courses
  const coursesKeywords = ['acheter', 'lait', 'pain', 'oeufs', 'farine', 'courses', 'supermarché', 'beurre', 'fromage']
  if (coursesKeywords.some(keyword => lowerContent.includes(keyword))) {
    const items = content.split(/[,;]/).map(item => item.trim()).filter(item => item.length > 0)
    return {
      type_suggestion: 'list_item',
      confidence: 0.7,
      extracted_data: {
        items: items.length > 1 ? items : undefined
      },
      suggestions: ['Ajoutez ces articles à votre liste de courses']
    }
  }

  // Détection idée (mots-clés projet)
  const ideaKeywords = ['projet', 'envie', 'rêve', 'aimerais', 'voudrais', 'partir', 'voyager', 'un jour', 'plus tard', '202']
  if (ideaKeywords.some(keyword => lowerContent.includes(keyword))) {
    return {
      type_suggestion: 'idea',
      confidence: 0.6,
      extracted_data: {},
      suggestions: ['Développez cette idée en projet concret']
    }
  }

  // Détection note (pas de verbe d'action)
  const notePatterns = ['code', 'mot de passe', 'numéro', 'adresse', 'allergique', 'aime', 'adore', 'déteste', 'anniversaire']
  if (notePatterns.some(pattern => lowerContent.includes(pattern))) {
    return {
      type_suggestion: 'note',
      confidence: 0.7,
      extracted_data: {},
      suggestions: ['Information enregistrée']
    }
  }

  // Détection task par verbes d'action
  const actionVerbs = ['appeler', 'réserver', 'acheter', 'faire', 'envoyer', 'payer', 'prendre', 'rappeler', 'contacter', 'aller']
  const hasAction = actionVerbs.some(verb => lowerContent.includes(verb))

  if (hasAction) {
    return {
      type_suggestion: 'task',
      confidence: 0.7,
      extracted_data: {},
      suggestions: ['Tâche ajoutée à votre liste']
    }
  }

  // Par défaut : task
  return {
    type_suggestion: 'task',
    confidence: 0.5,
    extracted_data: {},
    suggestions: ['Type à confirmer']
  }
}
