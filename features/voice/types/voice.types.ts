export type VoiceState = 'idle' | 'recording' | 'processing' | 'preview' | 'error'

export interface TranscriptionResult {
  transcript: string
  language: string
  duration: number
}
