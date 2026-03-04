'use client'

import { Mic, MicOff, X, Loader2 } from 'lucide-react'
import { useVoiceCapture } from '../hooks/useVoiceCapture'

interface VoiceButtonProps {
  onTranscript: (text: string) => void
  variant?: 'floating' | 'inline'
}

export function VoiceButton({ onTranscript, variant = 'floating' }: VoiceButtonProps) {
  const { state, transcript, recordingTime, error, startRecording, stopRecording, confirmTranscript, cancelRecording, clearError, setTranscript } = useVoiceCapture({ onTranscript })

  const handleClick = async () => {
    if (state === 'idle' || state === 'error') {
      await startRecording()
    } else if (state === 'recording') {
      await stopRecording()
    } else if (state === 'preview') {
      confirmTranscript()
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const isFloating = variant === 'floating'

  return (
    <>
      {/* Bouton principal */}
      <button
        onClick={handleClick}
        disabled={state === 'processing'}
        aria-label={
          state === 'idle' ? 'Démarrer la capture vocale'
          : state === 'recording' ? 'Arrêter l\'enregistrement'
          : state === 'processing' ? 'Transcription en cours'
          : state === 'preview' ? 'Valider la transcription'
          : 'Capture vocale'
        }
        className={[
          'flex items-center justify-center transition-all duration-200',
          isFloating
            ? 'fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full shadow-lg'
            : 'w-10 h-10 rounded-full',
          state === 'idle' || state === 'error'
            ? 'bg-[var(--color-primary)] text-white hover:opacity-90 active:scale-95'
            : state === 'recording'
            ? 'bg-red-500 text-white animate-pulse'
            : state === 'processing'
            ? 'bg-[var(--color-primary)] text-white opacity-70 cursor-not-allowed'
            : 'bg-[var(--color-primary)] text-white hover:opacity-90 active:scale-95',
        ].join(' ')}
      >
        {state === 'processing' ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : state === 'recording' ? (
          <MicOff className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </button>

      {/* Indicateur d'enregistrement */}
      {state === 'recording' && (
        <div className={[
          'flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full',
          isFloating ? 'fixed bottom-40 right-4 z-50 shadow-md' : 'mt-2',
        ].join(' ')}>
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-600 text-sm font-medium">{formatTime(recordingTime)}</span>
          <button
            onClick={cancelRecording}
            aria-label="Annuler l'enregistrement"
            className="ml-1 text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Preview transcript */}
      {state === 'preview' && transcript !== null && (
        <div className={[
          'bg-white border border-[var(--color-border)] rounded-2xl p-4 shadow-lg',
          isFloating ? 'fixed bottom-40 right-4 left-4 z-50' : 'mt-3',
        ].join(' ')}>
          <p className="text-sm text-[var(--color-text-muted)] mb-2">Retranscription — tu peux corriger :</p>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={3}
            className="w-full text-[var(--color-text-dark)] text-sm leading-relaxed border border-[var(--color-border)] rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] mb-3"
            autoFocus
          />
          <div className="flex items-center justify-between">
            <button
              onClick={cancelRecording}
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-dark)]"
            >
              Annuler
            </button>
            <button
              onClick={confirmTranscript}
              disabled={!transcript.trim()}
              className="px-4 py-1.5 bg-[var(--color-primary)] text-white text-sm rounded-xl hover:opacity-90 disabled:opacity-40"
            >
              Valider
            </button>
          </div>
        </div>
      )}

      {/* Erreur */}
      {state === 'error' && error && (
        <div className={[
          'bg-red-50 border border-red-200 rounded-2xl p-3',
          isFloating ? 'fixed bottom-40 right-4 left-4 z-50' : 'mt-2',
        ].join(' ')}>
          <p className="text-red-600 text-sm">{error.message}</p>
          <button
            onClick={clearError}
            className="text-red-400 text-xs mt-1 hover:text-red-600"
          >
            Réessayer
          </button>
        </div>
      )}
    </>
  )
}
