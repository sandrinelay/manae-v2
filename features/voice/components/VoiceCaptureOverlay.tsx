'use client'

import { useState, useRef } from 'react'
import { X, Send, Edit3, Loader2 } from 'lucide-react'

interface VoiceCaptureOverlayProps {
  transcript: string
  onTranscriptChange: (text: string) => void
  onSend: () => Promise<void>
  onEdit: () => void
  onClose: () => void
}

export function VoiceCaptureOverlay({ transcript, onTranscriptChange, onSend, onEdit, onClose }: VoiceCaptureOverlayProps) {
  const [isSending, setIsSending] = useState(false)
  const startYRef = useRef<number>(0)

  const handleSend = async () => {
    setIsSending(true)
    try {
      await onSend()
    } finally {
      setIsSending(false)
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    startYRef.current = e.clientY
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.clientY - startYRef.current > 80) onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl p-5 pb-8"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-[var(--color-text-muted)]">Retranscription — tu peux corriger :</p>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-dark)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transcript éditable */}
        <textarea
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          rows={3}
          autoFocus
          className="w-full text-[var(--color-text-dark)] text-sm leading-relaxed border border-[var(--color-border)] rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] mb-4"
        />

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleSend}
            disabled={isSending || !transcript.trim()}
            aria-label="Envoyer comme note"
            className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Envoyer
          </button>
          <button
            onClick={onEdit}
            aria-label="Modifier dans la page Capture"
            className="flex items-center justify-center gap-2 w-full py-3 border border-[var(--color-border)] text-[var(--color-text-dark)] text-sm rounded-xl hover:bg-gray-50"
          >
            <Edit3 className="w-4 h-4" />
            Modifier dans Capture
          </button>
        </div>
      </div>
    </>
  )
}
