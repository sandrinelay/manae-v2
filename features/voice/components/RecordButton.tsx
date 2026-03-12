'use client'

import { useRef, useState } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import type { VoiceState } from '../types/voice.types'

const HOLD_DURATION = 200

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
  const [isCharging, setIsCharging] = useState(false)

  // SVG arc dimensions — 8px larger than button to ring around it
  const buttonPx = size === 'lg' ? 56 : 40
  const svgPx = buttonPx + 8
  const radius = svgPx / 2 - 3
  const circumference = 2 * Math.PI * radius

  const clearPressTimer = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (state !== 'idle' && state !== 'error') return
    e.currentTarget.setPointerCapture(e.pointerId)
    isLongPressRef.current = false
    startXRef.current = e.clientX
    setIsCharging(true)
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      setIsCharging(false)
      navigator.vibrate?.(10)
      onStart()
    }, HOLD_DURATION)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isLongPressRef.current || state !== 'recording') return
    const deltaX = e.clientX - startXRef.current
    setIsCancelling(deltaX < -50)
  }

  const handlePointerUp = () => {
    setIsCharging(false)
    clearPressTimer()
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

  const handlePointerCancel = () => {
    setIsCharging(false)
    clearPressTimer()
    isLongPressRef.current = false
    setIsCancelling(false)
    if (state === 'recording') {
      onStop()
    }
  }

  const handleClick = () => {
    if (isLongPressRef.current) return
    if (state === 'idle' || state === 'error') {
      navigator.vibrate?.(10)
      void onStart()
    } else if (state === 'recording') {
      void onStop()
    }
  }

  const buttonSizeClass = size === 'lg' ? 'w-14 h-14' : 'w-10 h-10'

  const colorClass = isCancelling
    ? 'bg-gray-400 text-white'
    : state === 'recording'
    ? 'bg-red-500 text-white animate-pulse'
    : state === 'processing'
    ? 'bg-[var(--color-primary)] text-white opacity-70 cursor-not-allowed'
    : state === 'error'
    ? 'bg-orange-400 text-white'
    : 'bg-[var(--color-primary)] text-white'

  const ariaLabel = isCancelling
    ? 'Relâcher pour annuler'
    : state === 'idle' ? 'Démarrer la capture vocale'
    : state === 'recording' ? 'Appuyer pour arrêter'
    : state === 'processing' ? 'Transcription en cours'
    : 'Capture vocale'

  return (
    <div
      className="relative inline-flex items-center justify-center flex-shrink-0"
      style={{ width: svgPx, height: svgPx }}
    >
      {/* Arc de chargement — visible pendant le hold de 200ms */}
      {isCharging && (
        <>
          <style>{`
            @keyframes voice-arc-fill {
              from { stroke-dashoffset: ${circumference}; }
              to   { stroke-dashoffset: 0; }
            }
          `}</style>
          <svg
            className="absolute inset-0 pointer-events-none -rotate-90"
            width={svgPx}
            height={svgPx}
          >
            {/* Track (anneau vide) */}
            <circle
              cx={svgPx / 2}
              cy={svgPx / 2}
              r={radius}
              fill="none"
              stroke="var(--color-primary)"
              strokeOpacity={0.2}
              strokeWidth={3}
            />
            {/* Arc de remplissage */}
            <circle
              cx={svgPx / 2}
              cy={svgPx / 2}
              r={radius}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={circumference}
              style={{ animation: `voice-arc-fill ${HOLD_DURATION}ms linear forwards` }}
            />
          </svg>
        </>
      )}

      <button
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        disabled={state === 'processing'}
        aria-label={ariaLabel}
        className={[
          'flex items-center justify-center rounded-full transition-all duration-150 touch-none select-none',
          buttonSizeClass,
          colorClass,
          state !== 'recording' ? 'active:scale-75' : '',
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
    </div>
  )
}
