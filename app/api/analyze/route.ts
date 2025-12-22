import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

// ============================================
// TYPES
// ============================================

interface AnalyzeRequest {
  content: string
}

interface ExtractedData {
  context?: 'personal' | 'family' | 'work' | 'health' | 'other'
  date?: string
  time?: string
  duration?: number
  items?: string[]
  category?: string
}

interface AnalyzeResponse {
  type_suggestion: 'task' | 'note' | 'idea' | 'list_item'
  confidence: number
  extracted_data: ExtractedData
  suggestions: string[]
}

interface MultiItemResponse {
  content: string
  type_suggestion: 'task' | 'note' | 'idea' | 'list_item'
  confidence: number
  extracted_data: ExtractedData
  suggestions: string[]
}

interface MultiAnalyzeResponse {
  multiple: true
  items: MultiItemResponse[]
}

// ============================================
// API ROUTE
// ============================================

export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier configuration OpenAI
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured')
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

⚠️ RÈGLE CRITIQUE DE DÉCOUPAGE :

1. DÉCOUPE TOUJOURS si séparé par virgule ET verbes d'action répétés :
   - "Acheter X, acheter Y, acheter Z" → 3 tasks séparées
   - "Appeler X, appeler Y" → 2 tasks séparées

2. DÉCOUPE si "et" relie deux actions DIFFÉRENTES :
   - "Appeler dentiste et pédiatre" → 2 tasks séparées (2 personnes différentes à appeler)
   - "Acheter pain et lait" → 1 list_item (même action, articles de courses)

3. NE DÉCOUPE PAS si liste simple sans verbes répétés :
   - "Lait, pain, œufs" → 1 list_item groupé
   - "Faire X, Y et Z" → 1 task groupé (si même contexte)

TYPES POSSIBLES :
1. "task" : Action concrète à faire
2. "note" : Information à retenir (pas d'action)
3. "idea" : Projet abstrait à développer
4. "list_item" : Article(s) de courses

CONTEXTE À DÉTECTER (OBLIGATOIRE) :
- "personal" : Vie personnelle (coiffeur, sport, loisirs)
- "family" : Famille/enfants (pédiatre, école, activités enfants)
- "work" : Travail/professionnel
- "health" : Santé (médecin, dentiste, médicaments, soins)
- "other" : Si la pensée n'entre pas dans les 4 catégories ci-dessus

DONNÉES À EXTRAIRE :
- Contexte : OBLIGATOIRE
- Si date/heure mentionnée : extraire au format ISO
- Si durée mentionnée : extraire en minutes

Réponds UNIQUEMENT en JSON valide, sans markdown.

Si UNE SEULE pensée :
{
  "type_suggestion": "task",
  "confidence": 0.95,
  "extracted_data": {
    "context": "family",
    "date": null,
    "time": null,
    "duration": null,
    "items": null,
    "category": null
  },
  "suggestions": ["conseil 1"]
}

Si PLUSIEURS pensées distinctes (OBLIGATOIRE si verbes répétés ou personnes/entités différentes) :
{
  "multiple": true,
  "items": [
    {
      "content": "Appeler dentiste",
      "type_suggestion": "task",
      "confidence": 0.9,
      "extracted_data": { "context": "health" },
      "suggestions": []
    },
    {
      "content": "Appeler pédiatre",
      "type_suggestion": "task",
      "confidence": 0.9,
      "extracted_data": { "context": "family" },
      "suggestions": []
    }
  ]
}

EXEMPLES CONCRETS DE DÉCOUPAGE :
- "Appeler dentiste et pédiatre" → multiple: true, 2 items (dentiste=health, pédiatre=family)
- "Acheter vêtements, acheter dressing, acheter lit" → multiple: true, 3 items
- "Réserver coiffeur et ostéopathe" → multiple: true, 2 items (coiffeur=personal, ostéopathe=health)
- "Lait, pain, œufs" → multiple: false, 1 list_item
- "Acheter pain et lait" → multiple: false, 1 list_item`

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
      max_tokens: 1500
    })

    // 6. Parser la réponse
    const responseContent = completion.choices[0].message.content || ''

    // Nettoyer markdown si présent
    const cleanContent = responseContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    let aiResponse: AnalyzeResponse | MultiAnalyzeResponse
    try {
      aiResponse = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', cleanContent)
      const fallback = basicAnalysis(content)
      return NextResponse.json(fallback)
    }

    // 7. Gérer multi-pensées
    if ('multiple' in aiResponse && aiResponse.multiple && Array.isArray(aiResponse.items)) {
      return NextResponse.json({
        multiple: true,
        items: aiResponse.items
      })
    }

    // 8. Valider la réponse simple
    const singleResponse = aiResponse as AnalyzeResponse
    if (!['task', 'note', 'idea', 'list_item'].includes(singleResponse.type_suggestion)) {
      console.error('Invalid type from AI:', singleResponse.type_suggestion)
      const fallback = basicAnalysis(content)
      return NextResponse.json(fallback)
    }

    // S'assurer que le contexte est présent
    if (!singleResponse.extracted_data.context) {
      singleResponse.extracted_data.context = 'other'
    }

    // 9. Retourner le résultat
    return NextResponse.json(singleResponse)

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

  // Détection contexte basique
  const detectContext = (): 'personal' | 'family' | 'work' | 'health' | 'other' => {
    const familyKeywords = ['pédiatre', 'pediatre', 'école', 'ecole', 'enfant', 'bébé', 'bebe', 'crèche', 'creche', 'nounou', 'garderie']
    const healthKeywords = ['médecin', 'medecin', 'docteur', 'pharmacie', 'médicament', 'medicament', 'rdv médical', 'hopital', 'hôpital']
    const workKeywords = ['travail', 'bureau', 'réunion', 'reunion', 'client', 'projet pro', 'collègue', 'collegue', 'boss']
    const personalKeywords = ['coiffeur', 'sport', 'gym', 'yoga', 'massage', 'restaurant', 'cinéma', 'cinema', 'ami', 'copain']

    if (familyKeywords.some(k => lowerContent.includes(k))) return 'family'
    if (healthKeywords.some(k => lowerContent.includes(k))) return 'health'
    if (workKeywords.some(k => lowerContent.includes(k))) return 'work'
    if (personalKeywords.some(k => lowerContent.includes(k))) return 'personal'
    return 'other'
  }

  const context = detectContext()

  // Détection courses
  const coursesKeywords = ['acheter', 'lait', 'pain', 'oeufs', 'œufs', 'farine', 'courses', 'supermarché', 'beurre', 'fromage']
  if (coursesKeywords.some(keyword => lowerContent.includes(keyword))) {
    const items = content.split(/[,;]/).map(item => item.trim()).filter(item => item.length > 0)
    return {
      type_suggestion: 'list_item',
      confidence: 0.7,
      extracted_data: {
        context,
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
      extracted_data: { context },
      suggestions: ['Développez cette idée en projet concret']
    }
  }

  // Détection note (pas de verbe d'action)
  const notePatterns = ['code', 'mot de passe', 'numéro', 'adresse', 'allergique', 'aime', 'adore', 'déteste', 'anniversaire']
  if (notePatterns.some(pattern => lowerContent.includes(pattern))) {
    return {
      type_suggestion: 'note',
      confidence: 0.7,
      extracted_data: { context },
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
      extracted_data: { context },
      suggestions: ['Tâche ajoutée à votre liste']
    }
  }

  // Par défaut : task
  return {
    type_suggestion: 'task',
    confidence: 0.5,
    extracted_data: { context: 'other' },
    suggestions: ['Type à confirmer']
  }
}
