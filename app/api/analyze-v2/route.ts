import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import {
  SYSTEM_PROMPT,
  buildAnalysisPrompt,
  analyzeWithRules
} from '@/services/ai/analysis.service'
import type { OpenAIAnalysisResponse } from '@/services/ai/analysis.service'
import type { AIAnalyzedItem, ItemType, ItemState } from '@/types/items'
import { isValidItemTypeState } from '@/types/items'

export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier auth
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Récupérer le texte à analyser
    const body = await request.json()
    const { rawText } = body

    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: 'rawText is required' },
        { status: 400 }
      )
    }

    // 3. Vérifier si OpenAI est configuré
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured, using rule-based analysis')
      const fallbackResult = analyzeWithRules(rawText)
      return NextResponse.json({
        ...fallbackResult,
        warning: 'Analyse simplifiée (IA non configurée)'
      })
    }

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

    // 5. Appel OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    let completion
    let retries = 0
    const maxRetries = 2

    while (retries <= maxRetries) {
      try {
        completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildAnalysisPrompt(rawText, historyContext) }
          ],
          temperature: 0.5,
          max_tokens: 1500
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

    // 6. Parser la réponse
    const content = completion.choices[0].message.content || ''
    const cleanContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    let aiResponse: OpenAIAnalysisResponse
    try {
      aiResponse = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('Failed to parse AI response:', cleanContent)
      // Fallback sur règles basiques
      const fallbackResult = analyzeWithRules(rawText)
      return NextResponse.json({
        ...fallbackResult,
        warning: 'Analyse simplifiée (réponse IA invalide)'
      })
    }

    // 7. Valider et transformer les items
    const validatedItems: AIAnalyzedItem[] = aiResponse.items
      .map(item => {
        // Valider type/state
        let type = item.type as ItemType
        let state = item.state as ItemState

        // Corriger les combinaisons invalides
        if (!isValidItemTypeState(type, state)) {
          if (state === 'planned' && type !== 'task') {
            state = 'active'
          }
          if (state === 'project' && type !== 'idea') {
            state = 'active'
          }
        }

        return {
          content: item.content,
          type,
          state,
          context: item.context,
          ai_analysis: {
            type_suggestion: type,
            confidence: item.confidence || 0.8,
            extracted_data: item.extracted_data || {},
            suggestions: item.suggestions || []
          },
          metadata: item.reasoning ? { reasoning: item.reasoning } : {}
        }
      })

    return NextResponse.json({
      items: validatedItems,
      raw_input: rawText
    })

  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error('Analysis v2 error:', error)

    // Fallback complet sur règles basiques
    try {
      const body = await request.clone().json()
      if (body.rawText) {
        const fallbackResult = analyzeWithRules(body.rawText)
        return NextResponse.json({
          ...fallbackResult,
          warning: 'Analyse simplifiée (erreur IA)'
        })
      }
    } catch {
      // Ignore
    }

    return NextResponse.json(
      { error: err.message || 'Analysis failed' },
      { status: 500 }
    )
  }
}
