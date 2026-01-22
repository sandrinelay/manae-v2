import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { buildDevelopIdeaPrompt, DEVELOP_IDEA_CONFIG } from '@/prompts'
import type { DevelopIdeaResponseAPI } from '@/prompts'

// Coût en crédits pour le développement d'idée
const DEVELOP_IDEA_COST = 2

// ============================================
// TYPES
// ============================================

type IdeaAge = 'fresh' | 'old'
type IdeaBlocker = 'time' | 'budget' | 'fear' | 'energy'

interface RequestBody {
  itemId: string
  idea_age: IdeaAge
  blockers?: IdeaBlocker[]
}

interface DevelopmentContext {
  idea_age: IdeaAge
  blockers?: IdeaBlocker[]
  developed_at: string
}

// ============================================
// API ROUTE
// ============================================

export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier configuration OpenAI
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured')
      return NextResponse.json(
        { error: 'Service IA non configuré' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // 2. Vérifier authentification
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // 3. Parser le body
    const body: RequestBody = await request.json()
    const { itemId, idea_age, blockers } = body

    if (!itemId || !idea_age) {
      return NextResponse.json(
        { error: 'Paramètres manquants: itemId et idea_age requis' },
        { status: 400 }
      )
    }

    // Valider idea_age
    if (!['fresh', 'old'].includes(idea_age)) {
      return NextResponse.json(
        { error: 'idea_age doit être "fresh" ou "old"' },
        { status: 400 }
      )
    }

    // 4. Récupérer l'item
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .eq('user_id', user.id)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item non trouvé' }, { status: 404 })
    }

    if (item.type !== 'idea') {
      return NextResponse.json(
        { error: 'Cet item n\'est pas une idée' },
        { status: 400 }
      )
    }

    if (item.state === 'project') {
      return NextResponse.json(
        { error: 'Cette idée a déjà été développée' },
        { status: 400 }
      )
    }

    // 5. Construire et envoyer le prompt à OpenAI
    const prompt = buildDevelopIdeaPrompt({
      ideaText: item.content,
      ideaAge: idea_age,
      blockers
    })

    const completion = await openai.chat.completions.create({
      model: DEVELOP_IDEA_CONFIG.model,
      messages: [
        { role: 'system', content: DEVELOP_IDEA_CONFIG.system },
        { role: 'user', content: prompt }
      ],
      temperature: DEVELOP_IDEA_CONFIG.temperature,
      max_tokens: DEVELOP_IDEA_CONFIG.maxTokens
    })

    // 6. Parser la réponse IA
    const responseContent = completion.choices[0].message.content || ''
    const cleanContent = responseContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    let aiResponse: DevelopIdeaResponseAPI
    try {
      aiResponse = JSON.parse(cleanContent)
    } catch {
      console.error('Failed to parse AI response:', cleanContent)
      return NextResponse.json(
        { error: 'Réponse IA invalide, veuillez réessayer' },
        { status: 500 }
      )
    }

    // Valider la réponse
    if (!aiResponse.refined_title || !aiResponse.steps || !Array.isArray(aiResponse.steps)) {
      console.error('Invalid AI response structure:', aiResponse)
      return NextResponse.json(
        { error: 'Structure de réponse IA invalide' },
        { status: 500 }
      )
    }

    // 7. Mettre à jour l'item parent (idée → projet)
    const developmentContext: DevelopmentContext = {
      idea_age,
      blockers: idea_age === 'old' ? blockers : undefined,
      developed_at: new Date().toISOString()
    }

    const updatedMetadata = {
      ...(item.metadata || {}),
      development_context: developmentContext,
      original_content: item.content,
      estimated_time: aiResponse.estimated_time,
      budget: aiResponse.budget,
      motivation: aiResponse.motivation
    }

    const { error: updateError } = await supabase
      .from('items')
      .update({
        state: 'project',
        content: aiResponse.refined_title,
        metadata: updatedMetadata
      })
      .eq('id', itemId)

    if (updateError) {
      console.error('Failed to update item:', updateError)
      throw updateError
    }

    // 8. Créer les étapes comme items enfants (type: task)
    const stepsToInsert = aiResponse.steps.map((stepContent, index) => ({
      user_id: user.id,
      type: 'task' as const,
      state: 'active' as const,
      content: stepContent,
      context: item.context || 'personal',
      parent_id: itemId,
      metadata: {
        step_order: index + 1,
        from_project: itemId
      }
    }))

    const { data: createdSteps, error: stepsError } = await supabase
      .from('items')
      .insert(stepsToInsert)
      .select('id, content')

    if (stepsError) {
      console.error('Failed to create steps:', stepsError)
      // Rollback : remettre l'item en état 'idea' si les étapes échouent
      await supabase
        .from('items')
        .update({
          state: 'captured',
          content: item.content,
          metadata: item.metadata
        })
        .eq('id', itemId)

      throw stepsError
    }

    // 9. Tracker l'usage IA (2 crédits pour develop_idea)
    try {
      await supabase.rpc('track_ai_usage', {
        p_user_id: user.id,
        p_operation: 'develop_idea',
        p_cost_credits: DEVELOP_IDEA_COST,
        p_item_id: itemId
      })
    } catch (trackError) {
      // Non-blocking: on ne bloque pas si le tracking échoue
      console.error('Failed to track AI usage (non-blocking):', trackError)
    }

    // 10. Retourner le résultat
    return NextResponse.json({
      project: {
        id: itemId,
        content: item.content,
        refined_title: aiResponse.refined_title,
        estimated_time: aiResponse.estimated_time,
        budget: aiResponse.budget,
        motivation: aiResponse.motivation
      },
      steps: createdSteps?.map((step, index) => ({
        id: step.id,
        content: step.content,
        order: index + 1
      })) || []
    })

  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error('Development error:', error)
    return NextResponse.json(
      { error: err.message || 'Erreur lors du développement de l\'idée' },
      { status: 500 }
    )
  }
}
