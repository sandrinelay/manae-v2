'use client'

import { useState, useRef, useEffect } from 'react'
import { CaptureModal } from './CaptureModal'
import { MultiCaptureModal } from './MultiCaptureModal'
import { MoodSelector, type Mood } from './MoodSelector'
import { captureThought, saveItem, saveMultipleListItems, extractMultipleItems } from '@/services/capture'
import type { CaptureResult, MultiThoughtItem } from '@/services/capture'
import type { ItemType, Mood as ItemMood } from '@/types/items'
import type { ActionType } from './CaptureModal'

// Conversion des moods UI vers les moods DB
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

// Icônes
const MicrophoneIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
)

const CameraIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

interface CaptureFlowProps {
  userId: string
  onSuccess?: () => void
}

export function CaptureFlow({ userId, onSuccess }: CaptureFlowProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [content, setContent] = useState('')
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null)
  const [multiItems, setMultiItems] = useState<MultiThoughtItem[] | null>(null)
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

      // Multi-pensées détectées
      if (result.multiple && result.items && result.items.length > 1) {
        setMultiItems(result.items)
        setCaptureResult({
          success: true,
          aiUsed: true,
          creditsRemaining: result.creditsRemaining
        })
        return
      }

      // Pensée unique
      setCaptureResult(result)
    } catch (err) {
      console.error('Error:', err)
      setError('Une erreur est survenue')
    } finally {
      setIsCapturing(false)
    }
  }

  const handleSaveMultiPensée = async (index: number, type: ItemType, action: ActionType) => {
    if (!multiItems) return

    const pensée = multiItems[index]
    if (action === 'delete') return

    try {
      let state: 'active' | 'planned' | 'project' = 'active'
      if (action === 'plan') state = 'planned'
      if (action === 'develop') state = 'project'

      await saveItem({
        userId,
        type,
        content: pensée.content,
        state,
        mood: convertMoodToItemMood(selectedMood),
        context: pensée.context,
        aiAnalysis: pensée.ai_analysis
      })

      onSuccess?.()
    } catch (err) {
      console.error('Error saving:', err)
      setError('Erreur lors de la sauvegarde')
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

      await saveItem({
        userId,
        type,
        content,
        state,
        mood: convertMoodToItemMood(selectedMood),
        aiAnalysis: captureResult?.aiAnalysis
      })

      handleReset()
      onSuccess?.()
    } catch (err) {
      console.error('Error:', err)
      setError('Erreur lors de la sauvegarde')
    }
  }

  const handleReset = () => {
    setCaptureResult(null)
    setMultiItems(null)
    setContent('')
    setSelectedMood(null)
    setError(null)
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  return (
    <div className="flex-1 pb-32">
      {/* Barre décorative fixe sur toute la largeur */}
      <div
        className="h-1 w-full mb-4"
        style={{ background: 'linear-gradient(90deg, #4A7488, #BEE5D3)' }}
      />

      <div className="px-4">

      {/* Card principale */}
      <div className="bg-white rounded-3xl p-5 shadow-sm mb-6">
        {/* Titre */}
        <h1 className="text-xl font-bold text-text-dark mb-1">
          Qu'as-tu en tête ?
        </h1>
        <p className="text-sm text-text-muted mb-4">
          Tâches, notes, idées, courses... Dépose tout ici.
        </p>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ex: Acheter du café, améliorer ma routine du matin, penser à envoyer le mail à Lena, réserver un créneau sport"
          rows={4}
          className="w-full p-4 text-base border border-border rounded-2xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none text-text-dark placeholder:text-text-muted bg-white"
          disabled={isCapturing}
        />

        {/* Bottom row: icons (commentés pour l'instant) */}
        {/*
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-3">
            <button
              disabled
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-light text-text-muted"
              title="Dictée vocale (bientôt)"
            >
              <MicrophoneIcon />
            </button>
            <button
              disabled
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-light text-text-muted"
              title="Photo (bientôt)"
            >
              <CameraIcon />
            </button>
          </div>
        </div>
        */}
      </div>

      {/* Mood Selector */}
      <div className="mb-6">
        <MoodSelector
          selectedMood={selectedMood}
          onSelectMood={setSelectedMood}
          disabled={isCapturing}
        />
      </div>

      {/* Erreur */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl mb-6">
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}

      {/* Bouton CTA */}
      <button
        onClick={handleCapture}
        disabled={!content.trim() || isCapturing}
        className="w-full py-4 bg-primary text-white text-base font-semibold rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-3"
      >
        {isCapturing ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Analyse en cours...
          </>
        ) : (
          <>
            Capturer mes pensées
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </>
        )}
      </button>

      {/* Modal Multi-Pensées */}
      {multiItems && multiItems.length > 1 && (
        <MultiCaptureModal
          items={multiItems}
          mood={selectedMood}
          userId={userId}
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
          userId={userId}
          onSave={handleSave}
          onClose={handleReset}
          onSuccess={onSuccess}
        />
      )}
      </div>
    </div>
  )
}
