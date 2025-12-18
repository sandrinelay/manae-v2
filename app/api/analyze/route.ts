import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import type { LegacyAIAnalyzedItem as AIAnalyzedItem } from '@/types'

export async function POST(request: NextRequest) {
  try {
    // 0. Vérifier que la clé API OpenAI est configurée
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured')
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to .env.local' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // 1. Vérifier auth
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Récupérer thoughts non-processed
    const { data: thoughts, error: thoughtsError } = await supabase
      .from('thoughts')
      .select('*')
      .eq('user_id', user.id)
      .eq('processed', false)
      .order('created_at', { ascending: true })

    if (thoughtsError) throw thoughtsError

    if (!thoughts || thoughts.length === 0) {
      return NextResponse.json({
        error: 'No thoughts to analyze'
      }, { status: 400 })
    }

    // 3. Récupérer historique catégories user (pour contexte)
    const { data: pastItems } = await supabase
      .from('items')
      .select('category, text')
      .eq('user_id', user.id)
      .not('category', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20)

    const categoryContext = pastItems
      ? `Historique des catégories utilisées : ${pastItems.map(i => `"${i.text}" → ${i.category}`).join(', ')}`
      : ''

    // 4. Construire prompt
    const thoughtsText = thoughts.map(t => `- ${t.raw_text}`).join('\n')

    const prompt = `Tu es un assistant d'organisation pour parents débordés.

Analyse ces pensées capturées et découpe-les en items distincts si nécessaire.

PENSÉES À ANALYSER :
${thoughtsText}

${categoryContext}

Pour chaque item détecté, détermine :

1. TYPE (nature de la chose) :
   - "task" : Action concrète à faire (ex: "Appeler le dentiste")
   - "course" : Liste d'achats (ex: "Acheter lait, pain, œufs")
   - "note" : Information/mémo à retenir (ex: "Léa adore les licornes")

2. STATUS (maturité de l'action) :
   - "idea" : Envie floue, pas encore structurée (ex: "Faire un truc sympa ce week-end")
   - "ready" : Action claire et actionnable immédiatement (ex: "Réserver coiffeur samedi 10h")

3. CATEGORY (contexte) :
   - "work" : Professionnel
   - "personal" : Personnel
   - "kids" : Enfants/école
   - "admin" : Administratif/paperasse
   - "home" : Maison/ménage
   - "other" : Si incertain

4. PRIORITY (si détectable) :
   - "high" : Urgent/important
   - "medium" : Normal
   - "low" : Peut attendre

5. DEADLINE (si mentionnée) : Format ISO 8601

RÈGLES IMPORTANTES :
- Si la pensée contient plusieurs actions séparées par virgules ou "et", découpe-les
- Si c'est une envie vague sans action claire → status: "idea"
- Si c'est actionnable maintenant → status: "ready"
- Si mots-clés achats/courses → type: "course"
- Si info à retenir (pas d'action) → type: "note"
- Par défaut category: "other" si incertain

Réponds UNIQUEMENT en JSON valide, sans markdown :
{
  "items": [
    {
      "text": "texte reformulé clair",
      "type": "task" | "course" | "note",
      "status": "idea" | "ready",
      "category": "work" | "personal" | "kids" | "admin" | "home" | "other",
      "priority": "low" | "medium" | "high" ou null,
      "deadline": "ISO 8601" ou null,
      "reasoning": "explication courte du choix"
    }
  ]
}`

    // 5. Appel OpenAI avec retry
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
          temperature: 0.7,
          max_tokens: 2000
        })
        break // Succès, sortir de la boucle
      } catch (error: unknown) {
        const err = error as { status?: number }
        if (err.status === 429 && retries < maxRetries) {
          // Rate limit, attendre et réessayer
          await new Promise(resolve => setTimeout(resolve, 60000))
          retries++
        } else {
          throw error
        }
      }
    }

    if (!completion) {
      throw new Error('Failed to get completion after retries')
    }

    // 6. Parser réponse IA
    const content = completion.choices[0].message.content || ''

    // Nettoyer markdown si présent
    const cleanContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    let aiResponse
    try {
      aiResponse = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('Failed to parse AI response:', cleanContent)
      throw new Error('Invalid JSON from AI')
    }

    // 7. Insérer items en base
    const itemsToInsert = aiResponse.items.map((item: AIAnalyzedItem) => ({
      thought_id: thoughts[0].id, // Simplification : lier au premier thought
      text: item.text,
      type: item.type,
      status: item.status,
      category: item.category || 'other',
      priority: item.priority || null,
      deadline: item.deadline || null,
      analyzed_at: new Date().toISOString(),
      user_id: user.id
    }))

    const { data: insertedItems, error: insertError } = await supabase
      .from('items')
      .insert(itemsToInsert)
      .select()

    if (insertError) throw insertError

    // 8. Marquer thoughts comme processed
    const thoughtIds = thoughts.map(t => t.id)
    const { error: updateError } = await supabase
      .from('thoughts')
      .update({
        processed: true,
        processed_at: new Date().toISOString()
      })
      .in('id', thoughtIds)

    if (updateError) throw updateError

    // 9. Retourner résultat
    return NextResponse.json({
      items: insertedItems,
      thoughts_processed: thoughtIds
    })

  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error('Analysis error:', error)

    // Fallback règles basiques si IA plante
    if (err.message?.includes('OpenAI') || err.message?.includes('JSON')) {
      try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) throw new Error('No user')

        const { data: thoughts } = await supabase
          .from('thoughts')
          .select('*')
          .eq('user_id', user.id)
          .eq('processed', false)

        if (!thoughts || thoughts.length === 0) {
          return NextResponse.json({ error: 'No thoughts' }, { status: 400 })
        }

        // Analyse basique par règles
        const basicItems = thoughts.flatMap(thought =>
          basicAnalysis(thought.raw_text, thought.id, user.id)
        )

        const { data: insertedItems } = await supabase
          .from('items')
          .insert(basicItems)
          .select()

        const thoughtIds = thoughts.map(t => t.id)
        await supabase
          .from('thoughts')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .in('id', thoughtIds)

        return NextResponse.json({
          items: insertedItems,
          thoughts_processed: thoughtIds,
          warning: 'Analyse simplifiée utilisée (IA temporairement indisponible)'
        })
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError)
      }
    }

    return NextResponse.json(
      { error: err.message || 'Analysis failed' },
      { status: 500 }
    )
  }
}

// Type pour les items basiques
type BasicItem = {
  thought_id: string
  user_id: string
  text: string
  type: 'task' | 'course' | 'note'
  status: 'ready' | 'idea'
  category: string
  analyzed_at: string
}

// Fonction fallback analyse basique
function basicAnalysis(text: string, thoughtId: string, userId: string): BasicItem[] {
  const lowerText = text.toLowerCase()

  // Détection courses
  if (lowerText.includes('acheter') || lowerText.includes('courses') ||
      lowerText.includes('lait') || lowerText.includes('pain')) {
    return [{
      thought_id: thoughtId,
      user_id: userId,
      text: text,
      type: 'course',
      status: 'ready',
      category: 'home',
      analyzed_at: new Date().toISOString()
    }]
  }

  // Découpage par virgules/points
  const segments = text
    .split(/[,;]|\.(?!\d)/)
    .map(s => s.trim())
    .filter(s => s.length > 5)

  if (segments.length > 1) {
    return segments.map(segment => ({
      thought_id: thoughtId,
      user_id: userId,
      text: segment,
      type: 'task',
      status: 'ready',
      category: 'other',
      analyzed_at: new Date().toISOString()
    }))
  }

  // Fallback générique
  return [{
    thought_id: thoughtId,
    user_id: userId,
    text: text,
    type: 'task',
    status: 'ready',
    category: 'other',
    analyzed_at: new Date().toISOString()
  }]
}
