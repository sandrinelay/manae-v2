'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useVoiceCapture } from '../hooks/useVoiceCapture'
import { saveItem } from '@/services/capture'
import { RecordButton } from './RecordButton'
import { RecordingFeedback } from './RecordingFeedback'
import { VoiceCaptureOverlay } from './VoiceCaptureOverlay'

const HIDDEN_ROUTES = ['/capture', '/login', '/signup', '/onboarding', '/set-password', '/forgot-password']

export function VoiceButtonGlobal() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const { state, transcript, recordingTime, startRecording, stopRecording, cancelRecording, setTranscript } = useVoiceCapture({
    onTranscript: () => {}, // transcript lu directement depuis le hook en état 'preview'
  })

  if (isLoading || !user) return null
  if (HIDDEN_ROUTES.some((route) => pathname.startsWith(route))) return null

  const handleSend = async () => {
    if (!transcript) return
    await saveItem({
      userId: user.id,
      type: 'note',
      content: transcript,
      state: 'active',
    })
    cancelRecording()
  }

  const handleEdit = () => {
    if (!transcript) return
    router.push(`/capture?voice=${encodeURIComponent(transcript)}`)
    cancelRecording()
  }

  return (
    <>
      {/* Bouton flottant */}
      <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2">
        {state === 'recording' && (
          <RecordingFeedback
            recordingTime={recordingTime}
            onCancel={cancelRecording}
          />
        )}
        <RecordButton
          state={state}
          onStart={startRecording}
          onStop={stopRecording}
          onCancel={cancelRecording}
          size="lg"
          className="shadow-lg"
        />
      </div>

      {/* Overlay transcript */}
      {state === 'preview' && transcript !== null && (
        <VoiceCaptureOverlay
          transcript={transcript}
          onTranscriptChange={setTranscript}
          onSend={handleSend}
          onEdit={handleEdit}
          onClose={cancelRecording}
        />
      )}
    </>
  )
}
