'use client'

import { useState, useRef, useCallback } from 'react'

interface VoiceRecorderProps {
    onTranscription: (text: string) => void
}

export default function VoiceRecorder({ onTranscription }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const startTimeRef = useRef<number>(0)

    const processTranscription = useCallback(async (audioBlob: Blob) => {
        try {
            // TODO: Replace with real Whisper API call
            // For now, simulate transcription
            await new Promise(resolve => setTimeout(resolve, 1000))

            // Mock transcription
            const mockTranscription = "Appeler la maîtresse pour le rendez-vous"

            onTranscription(mockTranscription)
            setIsProcessing(false)
        } catch (error) {
            console.error('Transcription error:', error)
            alert('Erreur lors de la transcription')
            setIsProcessing(false)
        }
    }, [onTranscription])

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)

            mediaRecorderRef.current = mediaRecorder
            chunksRef.current = []
            startTimeRef.current = performance.now()

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data)
                }
            }

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop())

                // Process transcription
                await processTranscription(audioBlob)
            }

            mediaRecorder.start()
            setIsRecording(true)
        } catch (error) {
            console.error('Error accessing microphone:', error)
            alert('Impossible d\'accéder au microphone. Vérifie les permissions.')
        }
    }, [processTranscription])

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
            setIsProcessing(true)
        }
    }, [isRecording])

    const handleMouseDown = () => {
        startRecording()
    }

    const handleMouseUp = () => {
        stopRecording()
    }

    const handleTouchStart = (e: React.TouchEvent) => {
        e.preventDefault()
        startRecording()
    }

    const handleTouchEnd = (e: React.TouchEvent) => {
        e.preventDefault()
        stopRecording()
    }

    return (
        <button
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            disabled={isProcessing}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isRecording
                    ? 'bg-red-500 scale-110 shadow-lg animate-pulse'
                    : isProcessing
                        ? 'bg-text-muted'
                        : 'bg-primary hover:bg-primary-dark active:scale-95'
                } disabled:opacity-50`}
            aria-label={isRecording ? 'Enregistrement...' : 'Maintenir pour enregistrer'}
        >
            {isProcessing ? (
                <LoadingSpinner />
            ) : (
                <MicrophoneIcon isRecording={isRecording} />
            )}
        </button>
    )
}

function MicrophoneIcon({ isRecording }: { isRecording: boolean }) {
    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isRecording ? 'animate-pulse' : ''}
        >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
    )
}

function LoadingSpinner() {
    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-spin"
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    )
}