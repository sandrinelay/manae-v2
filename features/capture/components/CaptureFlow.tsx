'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CaptureModal } from './CaptureModal'
import { MultiCaptureModal } from './MultiCaptureModal'
import { MoodSelector, type Mood } from './MoodSelector'
import { captureThought, saveItem, saveMultipleListItems, extractMultipleItems } from '@/services/capture'
import type { CaptureResult, MultiThoughtItem } from '@/services/capture'
import type { ItemType, ItemContext, Mood as ItemMood } from '@/types/items'
import type { ActionType } from './CaptureModal'
import { useAIQuota } from '@/hooks/useAIQuota'
import { MicrophoneIcon, CameraIcon, SpinnerIcon, SendIcon } from '@/components/ui/icons'

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

interface CaptureFlowProps {
  userId: string
  onSuccess?: () => void
}

export function CaptureFlow({ userId, onSuccess }: CaptureFlowProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  // Hook quota IA
  const { quota, maxQuota, isLow, isExhausted, isLoading: isQuotaLoading } = useAIQuota()

  const handleUpgrade = () => {
    router.push('/settings/subscription')
  }

  const [content, setContent] = useState('')
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null)
  const [multiItems, setMultiItems] = useState<MultiThoughtItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resumedPlanning, setResumedPlanning] = useState(false)

  // Restaurer le contexte de planification après connexion Google Calendar
  useEffect(() => {
    const resumePlanning = searchParams.get('resumePlanning')

    if (resumePlanning === 'true' && !resumedPlanning) {
      const savedContext = localStorage.getItem('manae_pending_planning')

      if (savedContext) {
        try {
          const context = JSON.parse(savedContext)

          // Restaurer le contexte
          if (context.content) setContent(context.content)
          if (context.mood) setSelectedMood(context.mood)
          if (context.captureResult) setCaptureResult(context.captureResult)

          // Marquer comme restauré pour éviter les boucles
          setResumedPlanning(true)

          // Nettoyer le localStorage
          localStorage.removeItem('manae_pending_planning')

          // Nettoyer l'URL (enlever le paramètre)
          const url = new URL(window.location.href)
          url.searchParams.delete('resumePlanning')
          window.history.replaceState({}, '', url.pathname)

          console.log('[CaptureFlow] Contexte de planification restauré:', context)
        } catch (e) {
          console.error('[CaptureFlow] Erreur restauration contexte:', e)
          localStorage.removeItem('manae_pending_planning')
        }
      }
    }
  }, [searchParams, resumedPlanning])

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

  const handleSaveMultiPensée = async (index: number, type: ItemType, action: ActionType, context?: ItemContext) => {
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
        context: context || pensée.context,
        aiAnalysis: pensée.ai_analysis
      })

      onSuccess?.()
    } catch (err) {
      console.error('Error saving:', err)
      setError('Erreur lors de la sauvegarde')
    }
  }

  const handleSave = async (type: ItemType, action: ActionType, context?: ItemContext) => {
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
            context,
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
        context,
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
      <div className="px-4 pt-4">

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

      {/* Indicateur quota IA */}
      {!isQuotaLoading && quota !== null && maxQuota !== null && (
        <div className="mb-4">
          {/* Compteur discret (toujours visible) */}
          <div className="flex justify-end">
            <span className={`text-xs ${
              isExhausted ? 'text-red-500' : isLow ? 'text-orange-500' : 'text-text-muted'
            }`}>
              {quota}/{maxQuota} crédits IA
            </span>
          </div>

          {/* Alerte quota faible (1-3) */}
          {isLow && !isExhausted && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mt-3">
              <p className="text-orange-800 text-sm font-medium">
                Plus que {quota} crédit{quota > 1 ? 's' : ''} IA
              </p>
              <p className="text-orange-600 text-xs mt-1">
                Au-delà, tes pensées seront enregistrées sans tri automatique.
              </p>
              <button
                onClick={handleUpgrade}
                className="text-orange-700 text-xs mt-2 underline font-medium hover:text-orange-900"
              >
                Passer au forfait Plus
              </button>
            </div>
          )}

          {/* Alerte quota épuisé (0) */}
          {isExhausted && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-3">
              <p className="text-red-800 text-sm font-medium">
                Crédits IA épuisés
              </p>
              <p className="text-red-600 text-xs mt-1">
                Tes pensées seront enregistrées sans analyse automatique.
                Tu pourras les trier manuellement dans "Ma Liste".
              </p>
              <button
                onClick={handleUpgrade}
                className="mt-3 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Passer au forfait Plus
              </button>
            </div>
          )}
        </div>
      )}

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
            <SpinnerIcon className="animate-spin h-5 w-5" />
            Analyse en cours...
          </>
        ) : (
          <>
            Capturer mes pensées
            <SendIcon className="w-5 h-5" />
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
