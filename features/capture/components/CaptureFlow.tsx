'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
// import { useRouter } from 'next/navigation' // Commenté pour la beta
import { CaptureModal } from './CaptureModal'
import { MultiCaptureModal } from './MultiCaptureModal'
import { MoodSelector, type Mood } from './MoodSelector'
import { captureThought, saveItem, saveMultipleListItems, extractMultipleItems } from '@/services/capture'
import type { CaptureResult, MultiThoughtItem } from '@/services/capture'
import type { ItemType, ItemContext, Mood as ItemMood } from '@/types/items'
import type { ActionType } from './CaptureModal'
import { useAIQuota } from '@/contexts/AIQuotaContext'
import { SpinnerIcon, SendIcon } from '@/components/ui/icons'
import { X } from 'lucide-react'
// import { ActionButton } from '@/components/ui/ActionButton' // Commenté pour la beta
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { useVoiceCapture } from '@/features/voice/hooks/useVoiceCapture'
import { RecordButton } from '@/features/voice/components/RecordButton'
import { RecordingFeedback } from '@/features/voice/components/RecordingFeedback'

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
  // const router = useRouter() // Commenté pour la beta

  // Hook quota IA
  const { quota, maxQuota, isLow, isExhausted, isLoading: isQuotaLoading, refresh: refreshQuota } = useAIQuota()

  // Commenté pour la beta
  // const handleUpgrade = () => {
  //   router.push('/settings/subscription')
  // }

  const [content, setContent] = useState('')
  const contentSourceRef = useRef<'voice' | 'text'>('text')

  const { state: voiceState, recordingTime, startRecording, stopRecording, cancelRecording, confirmTranscript } = useVoiceCapture({
    onTranscript: (text) => {
      contentSourceRef.current = 'voice'
      setContent(text)
    },
  })

  // Dès que la transcription est prête, l'injecter dans le textarea et revenir à idle
  useEffect(() => {
    if (voiceState === 'preview') {
      confirmTranscript()
    }
  }, [voiceState, confirmTranscript])

  const [selectedMood, setSelectedMood] = useState<Mood | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null)
  const [multiItems, setMultiItems] = useState<MultiThoughtItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resumedPlanning, setResumedPlanning] = useState(false)


  // Restaurer le contexte de planification après connexion Google Calendar
  useEffect(() => {
    // Transcript vocal passé depuis VoiceButtonGlobal ("Modifier dans Capture")
    const voiceParam = searchParams.get('voice')
    if (voiceParam) {
      setContent(decodeURIComponent(voiceParam))
      const url = new URL(window.location.href)
      url.searchParams.delete('voice')
      window.history.replaceState({}, '', url.pathname)
    }

    const resumePlanning = searchParams.get('resumePlanning')

    if (resumePlanning === 'true' && !resumedPlanning) {
      const savedContext = localStorage.getItem('manae_pending_planning')

      if (savedContext) {
        try {
          const context = JSON.parse(savedContext)

          // Vérifier si c'est un contexte multi-capture
          if (context.isMultiCapture && context.multiCaptureContext) {
            console.log('[CaptureFlow] Restauration contexte multi-capture:', context.multiCaptureContext)

            // Restaurer les items multi-capture (en filtrant ceux déjà traités)
            const remainingItems = context.multiCaptureContext.items
              .filter((item: { saved?: boolean; deleted?: boolean }) => !item.saved && !item.deleted)
              .map((item: { content: string; type: ItemType; context?: ItemContext; ai_analysis?: unknown }) => ({
                content: item.content,
                type: item.type,
                context: item.context,
                ai_analysis: item.ai_analysis
              }))

            if (remainingItems.length > 0) {
              setMultiItems(remainingItems)
              // Mettre le contenu de la première pensée restante
              setContent(remainingItems[0].content)
            }

            if (context.mood) setSelectedMood(context.mood)
          } else {
            // Contexte simple (une seule pensée)
            if (context.content) setContent(context.content)
            if (context.mood) setSelectedMood(context.mood)
            if (context.captureResult) setCaptureResult(context.captureResult)
          }

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

  const handleCapture = async (overrideContent?: string) => {
    const textToCapture = overrideContent ?? content

    if (!textToCapture.trim()) {
      setError('Veuillez saisir une pensée')
      return
    }

    setIsCapturing(true)
    setError(null)

    try {
      const result = await captureThought(userId, textToCapture, contentSourceRef.current)

      if (!result.success) {
        setError(result.error || 'Erreur lors de la capture')
        return
      }

      // Rafraîchir le quota après utilisation de l'IA
      if (result.aiUsed) {
        refreshQuota()
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
            context: context || captureResult?.suggestedContext,
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
        context: context || captureResult?.suggestedContext,
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
    contentSourceRef.current = 'text'
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  const handlePullRefresh = async () => {
    await refreshQuota()
  }

  return (
    <>
      <PullToRefresh onRefresh={handlePullRefresh} className="flex-1 pb-32 px-4 pt-4">

        {/* Card principale */}
        <div className={[
          'rounded-3xl p-5 shadow-sm mb-6 transition-colors duration-200',
          voiceState === 'recording' ? 'bg-black/5' : 'bg-white',
        ].join(' ')}>
          {/* Titre */}
          <h1 className="text-xl font-bold text-text-dark mb-1">
            Qu&apos;as-tu en tête ?
          </h1>
          <p className="typo-hint mb-4">
            Tâches, notes, idées, courses... Dépose tout ici.
          </p>

          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => { contentSourceRef.current = 'text'; setContent(e.target.value) }}
              placeholder="Ex: Acheter du café, améliorer ma routine du matin, penser à envoyer le mail à Milo, réserver un créneau sport"
              rows={4}
              className="input-field p-4 rounded-2xl resize-none w-full"
              disabled={isCapturing}
            />
            {content && !isCapturing && (
              <button
                onClick={() => { setContent(''); textareaRef.current?.focus() }}
                aria-label="Effacer le texte"
                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-gray-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Bouton micro inline dans la card */}
          <div className="flex items-center justify-end gap-3 mt-3">
            {voiceState === 'recording' && (
              <RecordingFeedback
                recordingTime={recordingTime}
                onCancel={cancelRecording}
              />
            )}
            <RecordButton
              state={voiceState}
              onStart={startRecording}
              onStop={stopRecording}
              onCancel={cancelRecording}
              size="lg"
            />
          </div>
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
                isExhausted || isLow ? 'text-[var(--accent)]' : 'text-text-muted'
              }`}>
                {quota}/{maxQuota} crédits IA
              </span>
            </div>

            {/* Alerte quota faible (1-3) */}
            {isLow && !isExhausted && (
              <div className="alert-box mt-3">
                <p className="alert-box-title">
                  Plus que {quota} crédit{quota > 1 ? 's' : ''} IA
                </p>
                <p className="alert-box-text">
                  Au-delà, tes pensées seront enregistrées sans tri automatique.
                </p>
{/* Bouton forfait Plus commenté pour la beta
                <button
                  onClick={handleUpgrade}
                  className="text-[var(--accent)] text-xs mt-2 underline font-medium hover:text-[var(--accent-dark)]"
                >
                  Passer au forfait Plus
                </button>
                */}
                <p className="text-[var(--accent)] text-xs mt-2 font-medium">
                  Beta : les crédits seront renouvelés au fur et à mesure.
                </p>
              </div>
            )}

            {/* Alerte quota épuisé (0) */}
            {isExhausted && (
              <div className="alert-box mt-3">
                <p className="alert-box-title">
                  Crédits IA épuisés
                </p>
                <p className="alert-box-text">
                  Tes pensées seront enregistrées sans analyse automatique.
                  Tu pourras les trier manuellement dans &quot;Ma Liste&quot;.
                </p>
{/* Bouton forfait Plus commenté pour la beta
                <ActionButton
                  label="Passer au forfait Plus"
                  variant="save"
                  onClick={handleUpgrade}
                  className="mt-3"
                />
                */}
                <p className="text-[var(--accent)] text-xs mt-3 font-medium">
                  Beta : les crédits seront renouvelés chaque mois.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="alert-box mb-6">
            <p className="alert-box-title">{error}</p>
          </div>
        )}

        {/* Bouton CTA */}
        <button
          onClick={() => handleCapture()}
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
              Je dépose
              <SendIcon className="w-5 h-5" />
            </>
          )}
        </button>
      </PullToRefresh>

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
    </>
  )
}
