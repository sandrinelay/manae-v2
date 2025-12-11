import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import type { AIProjectDevelopment } from '@/types'

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

    // 2. Récupérer itemId depuis body
    const { itemId } = await request.json()

    if (!itemId) {
      return NextResponse.json({ error: 'Missing itemId' }, { status: 400 })
    }

    // 3. Récupérer l'item
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .eq('user_id', user.id)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (item.status !== 'idea') {
      return NextResponse.json({
        error: 'Item is not an idea'
      }, { status: 400 })
    }

    // 4. Construire prompt développement
    const prompt = `Tu es un assistant d'organisation pour parents débordés.

L'utilisateur a capturé cette idée floue : "${item.text}"

Aide-le à la transformer en projet concret et motivant.

TÂCHES :
1. Reformule l'idée en titre clair et engageant
2. Décompose en 3-5 étapes concrètes et actionnables
3. Estime le temps réaliste (pour parent débordé)
4. Estime le budget si applicable
5. Suggère le meilleur moment (week-end, soir, vacances)
6. Ajoute une phrase de motivation encourageante

CONTEXTE UTILISATEUR :
- Parent débordé avec charge mentale élevée
- Besoin de projets réalisables, pas idéalistes
- Apprécie les suggestions concrètes

Réponds UNIQUEMENT en JSON valide, sans markdown :
{
  "refined_text": "Titre clair du projet (max 60 caractères)",
  "steps": [
    "Étape 1 concrète et actionnable",
    "Étape 2 concrète et actionnable",
    "..."
  ],
  "estimated_time": "Temps réaliste (ex: 2h réparties sur 3 jours)",
  "budget": "Fourchette de prix (ex: 50-100€)" ou null si non applicable,
  "best_timing": "Moment idéal (ex: Week-end après-midi)",
  "motivation": "Phrase encourageante et positive (max 150 caractères)"
}`

    // 5. Appel OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Tu es un coach en organisation familiale. Tu aides à structurer des idées en projets concrets et motivants.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8, // Plus créatif pour développement
      max_tokens: 1500
    })

    // 6. Parser réponse
    const content = completion.choices[0].message.content || ''
    const cleanContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    let aiResponse: AIProjectDevelopment
    try {
      aiResponse = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('Failed to parse AI response:', cleanContent)
      throw new Error('Invalid JSON from AI')
    }

    // 7. Mettre à jour l'item en base
    const { data: updatedItem, error: updateError } = await supabase
      .from('items')
      .update({
        status: 'project',
        refined_text: aiResponse.refined_text,
        project_steps: aiResponse.steps,
        project_budget: aiResponse.budget,
        project_time: aiResponse.estimated_time,
        project_motivation: aiResponse.motivation,
        developed_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select()
      .single()

    if (updateError) throw updateError

    // 8. Retourner résultat
    return NextResponse.json({
      item: updatedItem,
      development: aiResponse
    })

  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error('Development error:', error)
    return NextResponse.json(
      { error: err.message || 'Failed to develop idea' },
      { status: 500 }
    )
  }
}
