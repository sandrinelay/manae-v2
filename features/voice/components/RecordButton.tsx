'use client'

import { useRef, useState } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import type { VoiceState } from '../types/voice.types'

interface RecordButtonProps {
  state: VoiceState
  onStart: () => void
  onStop: () => void
  onCancel: () => void
  size?: 'sm' | 'lg'
  className?: string
}

export function RecordButton({ state, onStart, onStop, onCancel, size = 'sm', className = '' }: RecordButtonProps) {
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPressRef = useRef(false)
  const startXRef = useRef<number>(0)
  const [isCancelling, setIsCancelling] = useState(false)

  const handlePointerDown = (e: React.PointerEvent) => {
    if (state !== 'idle' && state !== 'error') return
    isLongPressRef.current = false
    startXRef.current = e.clientX
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      onStart()
    }, 200)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isLongPressRef.current || state !== 'recording') return
    const deltaX = e.clientX - startXRef.current
    setIsCancelling(deltaX < -50)
  }

  const handlePointerUp = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
    if (isLongPressRef.current && state === 'recording') {
      if (isCancelling) {
        setIsCancelling(false)
        onCancel()
      } else {
        onStop()
      }
      setTimeout(() => { isLongPressRef.current = false }, 50)
    }
  }

  const handlePointerLeave = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
    if (isLongPressRef.current && state === 'recording') {
      isLongPressRef.current = false
      setIsCancelling(false)
      onStop()
    }
  }

  const handleClick = () => {
    // Clic court ignoré — seul le hold démarre l'enregistrement
    if (isLongPressRef.current) return
  }

  const sizeClass = size === 'lg' ? 'w-14 h-14' : 'w-10 h-10'

  const colorClass = isCancelling
    ? 'bg-gray-400 text-white'
    : state === 'recording'
    ? 'bg-red-500 text-white animate-pulse'
    : state === 'processing'
    ? 'bg-[var(--color-primary)] text-white opacity-70 cursor-not-allowed'
    : 'bg-[var(--color-primary)] text-white hover:opacity-90 active:scale-95'

  const ariaLabel = isCancelling
    ? 'Relâcher pour annuler'
    : state === 'idle' ? 'Démarrer la capture vocale'
    : state === 'recording' ? 'Relâcher pour arrêter'
    : state === 'processing' ? 'Transcription en cours'
    : 'Capture vocale'

  return (
    <button
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      disabled={state === 'processing'}
      aria-label={ariaLabel}
      className={[
        'flex items-center justify-center rounded-full transition-all duration-200 touch-none select-none',
        sizeClass,
        colorClass,
        className,
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
  )
}
