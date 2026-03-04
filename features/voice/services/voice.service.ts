import type { TranscriptionResult } from '../types/voice.types'

export const voiceService = {
  transcribe: async (audioBlob: Blob): Promise<TranscriptionResult> => {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erreur de transcription' }))
      throw new Error(error.error || 'Erreur de transcription')
    }

    return response.json()
  },
}
