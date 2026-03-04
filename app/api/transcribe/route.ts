import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer le fichier audio
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) {
      return NextResponse.json({ error: 'Fichier audio manquant' }, { status: 400 })
    }

    // Vérifier que la clé OpenAI est configurée
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Service de transcription non configuré' }, { status: 503 })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const startTime = Date.now()

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'fr',
    })

    const duration = (Date.now() - startTime) / 1000

    return NextResponse.json({
      transcript: transcription.text,
      language: 'fr',
      duration,
    })
  } catch (error) {
    console.error('[transcribe] Erreur:', error)
    return NextResponse.json({ error: 'Erreur lors de la transcription' }, { status: 500 })
  }
}
