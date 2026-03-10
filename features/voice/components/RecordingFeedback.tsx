'use client'

import { X } from 'lucide-react'

interface RecordingFeedbackProps {
  recordingTime: number
  onCancel: () => void
  className?: string
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function RecordingFeedback({ recordingTime, onCancel, className = '' }: RecordingFeedbackProps) {
  return (
    <div className={['flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full', className].join(' ')}>
      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      <span className="text-red-600 text-sm font-medium">{formatTime(recordingTime)}</span>
      <button
        onClick={onCancel}
        aria-label="Annuler l'enregistrement"
        className="ml-1 text-red-400 hover:text-red-600"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
