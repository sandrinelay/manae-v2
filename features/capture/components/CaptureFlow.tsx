'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CaptureModal } from './CaptureModal'
import { MoodSelector, type Mood } from './MoodSelector'
import { useGoogleCalendarStatus } from '@/hooks/useGoogleCalendarStatus'
import { captureThought, saveItem, saveMultipleListItems, extractMultipleItems } from '@/services/capture'
import type { CaptureResult } from '@/services/capture'
import type { ItemType, Mood as ItemMood } from '@/types/items'

type ActionType = 'save' | 'plan' | 'develop' | 'add_to_list' | 'delete'

// Conversion des moods UI vers les moods DB
function convertMoodToItemMood(mood: Mood | null): ItemMood | undefined {
  if (!mood) return undefined
  // Mapping : calm → neutral, overwhelmed → tired
  const mapping: Record<Mood, ItemMood> = {
    energetic: 'energetic',
    calm: 'neutral',
    overwhelmed: 'tired',
    tired: 'tired'
  }
  return mapping[mood]
}

interface CaptureFlowProps {
  userId: string
  onSuccess?: () => void
}

export function CaptureFlow({ userId, onSuccess }: CaptureFlowProps) {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { isConnected: isGoogleCalendarConnected } = useGoogleCalendarStatus()

  const [content, setContent] = useState('')
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleCapture = async () => {
    if (!content.trim()) {
      setError('Veuillez saisir une pensée')
      return
    }

    setIsCapturing(true)
    setError(null)

    try {
      const result = await captureThought(userId, content)

      if (!result.success) {
        setError(result.error || 'Erreur lors de la capture')
        return
      }

      setCaptureResult(result)
    } catch (err) {
      console.error('Error in handleCapture:', err)
      setError('Une erreur est survenue')
    } finally {
      setIsCapturing(false)
    }
  }

  const handleSave = async (type: ItemType, action: ActionType) => {
    if (action === 'delete') {
      handleReset()
      return
    }

    try {
      let state: 'active' | 'planned' | 'project' = 'active'
      if (action === 'plan') state = 'planned'
      if (action === 'develop') state = 'project'

      if (type === 'list_item') {
        const items = extractMultipleItems(content)

        if (items.length > 1) {
          await saveMultipleListItems(userId, items, captureResult?.aiAnalysis)
        } else {
          await saveItem({
            userId,
            type,
            content: items[0] || content,
            state,
            mood: convertMoodToItemMood(selectedMood),
            aiAnalysis: captureResult?.aiAnalysis
          })
        }

        handleReset()
        onSuccess?.()
        return
      }

      const itemId = await saveItem({
        userId,
        type,
        content,
        state,
        mood: convertMoodToItemMood(selectedMood),
        aiAnalysis: captureResult?.aiAnalysis
      })

      handleReset()

      switch (action) {
        case 'plan':
          router.push(`/items/${itemId}/schedule`)
          break
        case 'develop':
          router.push(`/ideas/${itemId}/develop`)
          break
        default:
          onSuccess?.()
          break
      }
    } catch (err) {
      console.error('Error in handleSave:', err)
      setError('Erreur lors de la sauvegarde')
    }
  }

  const handleReset = () => {
    setCaptureResult(null)
    setContent('')
    setSelectedMood(null)
    setError(null)

    setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
  }

  return (
    <div className="min-h-screen bg-mint flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">

        {/* Titre */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-text-dark font-quicksand">
            Qu'avez-vous en tête ?
          </h1>
          <p className="text-text-muted">
            Tâches, notes, courses, idées... Déposez tout ici.
          </p>
        </div>

        {/* Textarea */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Ex: Appeler pédiatre pour Milo, ajouter les oeufs et la farine, partir au Cambodge en 2027"
            rows={8}
            className="w-full p-6 text-lg border-2 border-border rounded-3xl focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all resize-none text-text-dark placeholder:text-text-muted shadow-sm bg-white"
            disabled={isCapturing}
          />

          {/* Icônes bas gauche (désactivées) */}
          <div className="absolute bottom-4 left-4 flex gap-3">
            <button disabled className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-light text-text-muted cursor-not-allowed">
              🎤
            </button>
            <button disabled className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-light text-text-muted cursor-not-allowed">
              📷
            </button>
          </div>

          {/* IA READY */}
          <div className="absolute bottom-4 right-4 text-xs text-primary font-medium">
            IA READY
          </div>
        </div>

        {/* Mood Selector */}
        <MoodSelector
          selectedMood={selectedMood}
          onSelectMood={setSelectedMood}
          disabled={isCapturing}
        />

        {/* Erreur */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* Bouton Capturer */}
        <button
          onClick={handleCapture}
          disabled={!content.trim() || isCapturing}
          className="w-full py-5 bg-text-dark text-white text-lg font-semibold rounded-full hover:opacity-90 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl"
        >
          {isCapturing ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Analyse en cours...
            </span>
          ) : (
            'Capturer mes pensées'
          )}
        </button>

        {/* Bouton Google Calendar (si non connecté) */}
        {!isGoogleCalendarConnected && (
          <div className="space-y-2">
            <button
              onClick={() => router.push('/settings/calendar')}
              className="w-full py-4 border-2 border-primary text-primary font-medium rounded-2xl hover:bg-mint transition-all flex items-center justify-center gap-2"
            >
              <span>📅</span>
              Connecter Google Calendar
            </button>
            <p className="text-xs text-center text-text-muted">
              Important pour des suggestions pertinentes
            </p>
          </div>
        )}

        {/* Hint */}
        <p className="text-sm text-text-muted text-center">
          L'IA organise tout pour vous
        </p>
      </div>

      {/* Modal */}
      {captureResult && (
        <CaptureModal
          content={content}
          captureResult={captureResult}
          mood={selectedMood}
          onSave={handleSave}
          onClose={handleReset}
        />
      )}
    </div>
  )
}
