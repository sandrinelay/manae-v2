'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CaptureModal } from './CaptureModal'
import { MultiCaptureModal } from './MultiCaptureModal'
import { MoodSelector, type Mood } from './MoodSelector'
import { useGoogleCalendarStatus } from '@/hooks/useGoogleCalendarStatus'
import { captureThought, saveItem, saveMultipleListItems, extractMultipleItems } from '@/services/capture'
import { openGoogleAuthPopup, exchangeCodeForToken } from '@/lib/googleCalendar'
import type { CaptureResult, MultiThoughtItem } from '@/services/capture'
import type { ItemType, Mood as ItemMood } from '@/types/items'
import type { ActionType } from './CaptureModal'

// Conversion des moods UI vers les moods DB
// UI: calm → DB: neutral (les autres sont identiques)
function convertMoodToItemMood(mood: Mood | null): ItemMood | undefined {
  if (!mood) return undefined
  const mapping: Record<Mood, ItemMood> = {
    energetic: 'energetic',
    calm: 'neutral',
    overwhelmed: 'overwhelmed',
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
  const [multiItems, setMultiItems] = useState<MultiThoughtItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleConnectCalendar = async () => {
    if (isConnectingCalendar) return

    setIsConnectingCalendar(true)

    try {
      const code = await openGoogleAuthPopup()
      const tokens = await exchangeCodeForToken(code)
      localStorage.setItem('google_tokens', JSON.stringify(tokens))

      window.dispatchEvent(new CustomEvent('calendar-connection-changed', {
        detail: { connected: true }
      }))

      console.log('Google Calendar connected successfully')
    } catch (err) {
      console.error('Error connecting Google Calendar:', err)
      setError('Erreur lors de la connexion à Google Calendar')
    } finally {
      setIsConnectingCalendar(false)
    }
  }

  const handleCapture = async () => {
    console.log('🚀 [CaptureFlow] handleCapture CALLED')

    if (!content.trim()) {
      setError('Veuillez saisir une pensée')
      return
    }

    setIsCapturing(true)
    setError(null)

    try {
      const result = await captureThought(userId, content)
      console.log('🚀 [CaptureFlow] captureThought returned:', result)

      if (!result.success) {
        setError(result.error || 'Erreur lors de la capture')
        return
      }

      // Multi-pensées détectées → ouvrir MultiCaptureModal
      if (result.multiple && result.items && result.items.length > 1) {
        console.log('🚀 [CaptureFlow] Multi-pensées détectées:', result.items.length)
        setMultiItems(result.items)
        // Stocker les crédits restants dans captureResult pour MultiCaptureModal
        setCaptureResult({
          success: true,
          aiUsed: true,
          creditsRemaining: result.creditsRemaining
        })
        return
      }

      // Pensée unique → ouvrir CaptureModal normale
      setCaptureResult(result)
    } catch (err) {
      console.error('🚀 [CaptureFlow] CATCH ERROR:', err)
      setError('Une erreur est survenue')
    } finally {
      setIsCapturing(false)
    }
  }

  // Handler pour sauvegarder une pensée depuis MultiCaptureModal
  const handleSaveMultiPensée = async (index: number, type: ItemType, action: ActionType) => {
    if (!multiItems) return

    const pensée = multiItems[index]

    if (action === 'delete') {
      return // Skip, géré par MultiCaptureModal
    }

    try {
      let state: 'active' | 'planned' | 'project' = 'active'
      if (action === 'plan') state = 'planned'
      if (action === 'develop') state = 'project'

      const itemId = await saveItem({
        userId,
        type,
        content: pensée.content,
        state,
        mood: convertMoodToItemMood(selectedMood),
        aiAnalysis: {
          type_suggestion: pensée.type_suggestion,
          confidence: pensée.confidence,
          extracted_data: pensée.extracted_data,
          suggestions: pensée.suggestions
        }
      })

      console.log('🚀 [handleSaveMultiPensée] Saved item:', itemId)

      // Navigation pour actions spéciales
      if (action === 'plan') {
        router.push(`/items/${itemId}/schedule`)
      } else if (action === 'develop') {
        router.push(`/ideas/${itemId}/develop`)
      }

      onSuccess?.()
    } catch (err) {
      console.error('Error saving multi-pensée:', err)
      setError('Erreur lors de la sauvegarde')
    }
  }

  // Handler pour pensée unique (CaptureModal)
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
    setMultiItems(null)
    setContent('')
    setSelectedMood(null)
    setError(null)

    setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
  }

  return (
    <div className="flex-1 p-6">
      <div className="w-full max-w-2xl mx-auto space-y-6">

        {/* Titre */}
        <div className="text-left space-y-2">
          <h1 className="text-2xl font-bold text-text-dark font-quicksand">
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
            rows={6}
            className="w-full p-6 text-lg border-2 border-border rounded-3xl focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all resize-none text-text-dark placeholder:text-text-muted shadow-sm bg-white"
            disabled={isCapturing}
          />

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
              onClick={handleConnectCalendar}
              disabled={isConnectingCalendar}
              className="w-full py-4 border-2 border-primary text-primary font-medium rounded-2xl hover:bg-mint transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnectingCalendar ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Connexion...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Connecter Google Calendar
                </>
              )}
            </button>
            <p className="text-xs text-center text-text-muted">
              Important pour des suggestions pertinentes
            </p>
          </div>
        )}

        {/* Hint */}
        <p className="text-sm text-text-muted text-center">
          Manae organise tout pour toi
        </p>
      </div>

      {/* Modal Multi-Pensées */}
      {multiItems && multiItems.length > 1 && (
        <MultiCaptureModal
          items={multiItems}
          mood={selectedMood}
          creditsRemaining={captureResult?.creditsRemaining}
          onSave={handleSaveMultiPensée}
          onClose={handleReset}
        />
      )}

      {/* Modal Pensée Unique */}
      {captureResult && !multiItems && (
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
