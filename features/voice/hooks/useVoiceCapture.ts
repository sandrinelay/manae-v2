'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { voiceService } from '../services/voice.service'
import type { VoiceState } from '../types/voice.types'

interface UseVoiceCaptureOptions {
  onTranscript: (text: string) => void
}

interface UseVoiceCaptureReturn {
  state: VoiceState
  transcript: string | null
  recordingTime: number
  error: Error | null
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  confirmTranscript: () => void
  cancelRecording: () => void
  clearError: () => void
  setTranscript: (text: string) => void
}

export function useVoiceCapture({ onTranscript }: UseVoiceCaptureOptions): UseVoiceCaptureReturn {
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoConfirmRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (autoConfirmRef.current) clearTimeout(autoConfirmRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (autoConfirmRef.current) clearTimeout(autoConfirmRef.current)
    mediaRecorderRef.current = null
    audioChunksRef.current = []
    setRecordingTime(0)
    setTranscript(null)
    setError(null)
    setState('idle')
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError(null)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start(100)
      setState('recording')

      // Compteur de temps
      setRecordingTime(0)
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Impossible d\'accéder au microphone')
      setError(error)
      setState('error')
    }
  }, [])

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    setState('processing')

    return new Promise<void>((resolve) => {
      if (!mediaRecorderRef.current) return resolve()

      mediaRecorderRef.current.onstop = async () => {
        // Arrêter les tracks audio
        const stream = mediaRecorderRef.current?.stream
        stream?.getTracks().forEach((track) => track.stop())

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

          if (audioBlob.size < 1000) {
            setError(new Error('Enregistrement trop court'))
            setState('error')
            return resolve()
          }

          const result = await voiceService.transcribe(audioBlob)

          if (!result.transcript.trim()) {
            setError(new Error('Aucune voix détectée'))
            setState('error')
            return resolve()
          }

          setTranscript(result.transcript)
          setState('preview')
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Erreur de transcription')
          setError(error)
          setState('error')
        }

        resolve()
      }

      mediaRecorderRef.current.stop()
    })
  }, [onTranscript, reset])

  const confirmTranscript = useCallback(() => {
    if (autoConfirmRef.current) clearTimeout(autoConfirmRef.current)
    if (transcript) {
      onTranscript(transcript)
    }
    reset()
  }, [transcript, onTranscript, reset])

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const stream = mediaRecorderRef.current.stream
      stream?.getTracks().forEach((track) => track.stop())
      mediaRecorderRef.current.stop()
    }
    reset()
  }, [reset])

  const clearError = useCallback(() => {
    setError(null)
    setState('idle')
  }, [])

  return {
    state,
    transcript,
    recordingTime,
    error,
    startRecording,
    stopRecording,
    confirmTranscript,
    cancelRecording,
    clearError,
    setTranscript,
  }
}
