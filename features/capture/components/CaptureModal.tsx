'use client'

import { useState, useEffect, type ReactNode } from 'react'
import type { ItemType, ItemContext } from '@/types/items'
import type { CaptureResult } from '@/services/capture'
import { useScheduling } from '@/features/schedule/hooks/useScheduling'
import { DurationSelector } from '@/features/schedule/components/DurationSelector'
import { TimeSlotCard } from '@/features/schedule/components/TimeSlotCard'
import { SuccessModal, formatScheduledDate } from '@/features/schedule/components/SuccessModal'
import GoogleCalendarCTA from '@/components/capture/GoogleCalendarCTA'
import { useGoogleCalendarStatus } from '@/hooks/useGoogleCalendarStatus'
import { saveItem } from '@/services/capture'
import type { Mood as ItemMood } from '@/types/items'
import { IdeaDevelopPanel } from '@/features/ideas/components/IdeaDevelopPanel'
import { CONTEXT_CONFIG } from '@/config/contexts'
import {
  TaskIcon,
  NoteIcon,
  ShoppingIcon,
  IdeaIcon,
  TrashIcon,
  ArrowLeftIcon,
  XIcon,
  AlertIcon
} from '@/components/ui/icons'
import { IconButton } from '@/components/ui/IconButton'
import { ActionButton } from '@/components/ui/ActionButton'

// ============================================
// TYPES
// ============================================

type Mood = 'energetic' | 'calm' | 'overwhelmed' | 'tired'

// Conversion UI mood -> DB mood
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
type ModalStep = 'organize' | 'schedule'

// Contexte multi-capture pour préserver l'état lors de la connexion Google Calendar
export interface MultiCaptureContext {
  items: Array<{
    content: string
    type: ItemType
    context?: ItemContext
    ai_analysis?: CaptureResult['aiAnalysis']
    saved?: boolean
    deleted?: boolean
  }>
  currentIndex: number
}

interface CaptureModalProps {
  content: string
  captureResult: CaptureResult
  mood: Mood | null
  userId: string
  onSave: (type: ItemType, action: ActionType, context?: ItemContext) => void
  onClose: () => void
  onSuccess?: () => void
  isEmbedded?: boolean
  multiCaptureContext?: MultiCaptureContext
}

export type ActionType = 'save' | 'plan' | 'develop' | 'add_to_list' | 'delete'

interface ActionConfig {
  label: string
  value: ActionType
  requiresAI?: boolean
  variant?: 'save' | 'plan' | 'secondary'
}

// ============================================
// CONFIGURATION
// ============================================

const TYPE_CONFIG: Record<ItemType, {
  icon: React.FC<{ className?: string }>
  label: string
  actions: ActionConfig[]
}> = {
  task: {
    icon: TaskIcon,
    label: 'Tâche',
    actions: [
      { label: 'Enregistrer', value: 'save', variant: 'save' },
      { label: 'Planifier', value: 'plan', variant: 'plan', requiresAI: true }
    ]
  },
  note: {
    icon: NoteIcon,
    label: 'Note',
    actions: [
      { label: 'Ajouter', value: 'save', variant: 'save' }
    ]
  },
  list_item: {
    icon: ShoppingIcon,
    label: 'Course',
    actions: [
      { label: 'Ajouter', value: 'add_to_list', variant: 'save' }
    ]
  },
  idea: {
    icon: IdeaIcon,
    label: 'Idée',
    actions: [
      { label: 'Enregistrer', value: 'save', variant: 'save' },
      { label: 'Développer', value: 'develop', variant: 'plan', requiresAI: true }
    ]
  }
}

// Labels courts pour la capture (le CONTEXT_CONFIG global a les labels complets)
const CONTEXT_SHORT_LABELS: Record<ItemContext, string> = {
  personal: 'Perso',
  family: 'Famille',
  work: 'Travail',
  health: 'Santé',
  other: 'Autre'
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export function CaptureModal({
  content,
  captureResult,
  mood,
  userId,
  onSave,
  onClose,
  onSuccess,
  isEmbedded = false,
  multiCaptureContext
}: CaptureModalProps) {
  const hasAIQuota = !captureResult.quotaExceeded

  // Contexte suggéré par l'IA (priorité: suggestedContext > extracted_data.context > fallback)
  const suggestedContext = captureResult.suggestedContext
    || (captureResult.aiAnalysis?.extracted_data?.context as ItemContext)
    || 'personal'

  // État de la modal
  const [currentStep, setCurrentStep] = useState<ModalStep>('organize')
  const [selectedType, setSelectedType] = useState<ItemType>(captureResult.suggestedType || 'task')
  const [selectedContext, setSelectedContext] = useState<ItemContext>(suggestedContext)
  const [savedItemId, setSavedItemId] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successData, setSuccessData] = useState<{ task: string; date: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showDevelopPanel, setShowDevelopPanel] = useState(false)

  // Google Calendar status
  const { isConnected: isCalendarConnected } = useGoogleCalendarStatus()

  // Convertir mood pour le scheduling
  const schedulingMood = mood === 'energetic' ? 'energetic' : mood === 'tired' ? 'tired' : 'neutral'

  // Récupérer la contrainte temporelle de l'analyse IA
  const temporalConstraint = captureResult.aiAnalysis?.temporal_constraint || null

  // Hook scheduling
  const scheduling = useScheduling({
    itemId: savedItemId || '',
    taskContent: content,
    mood: schedulingMood,
    temporalConstraint
  })

  // Charger les créneaux quand on passe à l'étape schedule
  useEffect(() => {
    if (currentStep === 'schedule' && savedItemId && isCalendarConnected) {
      scheduling.loadSlots()
    }
  }, [currentStep, savedItemId, isCalendarConnected])

  // ============================================
  // HANDLERS
  // ============================================

  const handlePlanAction = async () => {
    setIsSaving(true)
    try {
      // 1. Sauvegarder l'item en DB (state: 'active' pour l'instant)
      const itemId = await saveItem({
        userId,
        type: 'task',
        content,
        state: 'active',
        mood: convertMoodToItemMood(mood),
        context: selectedContext,
        aiAnalysis: captureResult.aiAnalysis
      })

      setSavedItemId(itemId)

      // 2. Passer à l'étape 'schedule'
      setCurrentStep('schedule')
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDevelopAction = async () => {
    setIsSaving(true)
    try {
      // 1. Sauvegarder l'idée en DB (state: 'captured')
      const itemId = await saveItem({
        userId,
        type: 'idea',
        content,
        state: 'captured',
        mood: convertMoodToItemMood(mood),
        context: selectedContext,
        aiAnalysis: captureResult.aiAnalysis
      })

      setSavedItemId(itemId)

      // 2. Afficher le panel de développement
      setShowDevelopPanel(true)
    } catch (error) {
      console.error('Erreur sauvegarde idée:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDevelopSuccess = () => {
    // Appelé quand le développement est terminé avec succès
    onSuccess?.()
  }

  const handleDevelopClose = () => {
    setShowDevelopPanel(false)
    onClose()
  }

  const handleBack = () => {
    setCurrentStep('organize')
  }

  const handleSchedule = async () => {
    if (!scheduling.selectedSlot) return

    // Capturer le slot AVANT l'appel async
    const slotToSchedule = scheduling.selectedSlot

    try {
      const success = await scheduling.scheduleTask()

      if (success) {
        // En mode embedded (multi-capture), notifier le parent et passer à la suite
        if (isEmbedded) {
          // Appeler onSave avec 'plan' pour marquer comme sauvegardée dans MultiCaptureModal
          onSave('task', 'plan')
          return
        }

        // Mode normal : afficher la modal de succès
        const dateLabel = formatScheduledDate(`${slotToSchedule.date}T${slotToSchedule.startTime}:00`)
        setSuccessData({ task: content, date: dateLabel })
        setShowSuccessModal(true)
      }
    } catch (error) {
      console.error('Erreur planification:', error)
    }
  }

  const handleSuccessClose = () => {
    setShowSuccessModal(false)
    onSuccess?.()
    onClose()
  }

  const handleConnectCalendar = () => {
    // Sauvegarder le contexte de planification pour y revenir après connexion
    const planningContext: {
      itemId: string | null
      content: string
      mood: Mood | null
      captureResult: CaptureResult
      returnTo: string
      isMultiCapture?: boolean
      multiCaptureContext?: MultiCaptureContext
    } = {
      itemId: savedItemId,
      content,
      mood,
      captureResult,
      returnTo: 'schedule'
    }

    // Si on est en mode multi-capture, sauvegarder tout le contexte
    if (multiCaptureContext) {
      planningContext.isMultiCapture = true
      planningContext.multiCaptureContext = multiCaptureContext
    }

    localStorage.setItem('manae_pending_planning', JSON.stringify(planningContext))

    // Rediriger vers step4 avec indication de retour
    window.location.href = '/onboarding/step4?returnTo=planning'
  }

  const handleAction = (type: ItemType, action: ActionType) => {
    if (action === 'plan' && type === 'task') {
      handlePlanAction()
    } else if (action === 'develop' && type === 'idea') {
      handleDevelopAction()
    } else {
      onSave(type, action, selectedContext)
    }
  }

  const config = TYPE_CONFIG[selectedType]

  // ============================================
  // RENDER - ORGANIZE STEP
  // ============================================

  const OrganizeContent = () => (
    <div className="space-y-4">
      {/* Message quota IA dépassé */}
      {captureResult.quotaExceeded && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Quota IA épuisé cette semaine</p>
              <p className="text-amber-700 mt-1">
                Catégorise manuellement ou{' '}
                <a href="/settings/subscription" className="text-primary underline font-medium hover:text-primary/80">
                  passe au forfait supérieur
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Indicateur IA + crédits restants */}
      {captureResult.aiUsed && captureResult.suggestedType && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-primary">IA suggère :</span>
            <span className="font-medium text-primary flex items-center gap-1">
              {(() => {
                const SuggestedIcon = TYPE_CONFIG[captureResult.suggestedType].icon
                return <SuggestedIcon className="w-5 h-5" />
              })()}
              {TYPE_CONFIG[captureResult.suggestedType].label}
            </span>
          </div>
          {captureResult.creditsRemaining !== undefined && captureResult.creditsRemaining !== null && (
            <span className="text-xs text-text-muted">
              {captureResult.creditsRemaining} crédit{captureResult.creditsRemaining !== 1 ? 's' : ''} IA restant{captureResult.creditsRemaining !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Contenu capturé */}
      <div className="p-4 bg-mint rounded-xl border border-border">
        <p className="text-text-dark whitespace-pre-wrap">{content}</p>
      </div>

      {/* Types - Icônes seulement */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-text-dark">Type :</p>
        <div className="flex gap-2">
          {(Object.keys(TYPE_CONFIG) as ItemType[]).map((type) => {
            const typeConfig = TYPE_CONFIG[type]
            const isSelected = selectedType === type
            const TypeIcon = typeConfig.icon

            return (
              <IconButton
                key={type}
                icon={<TypeIcon />}
                label={typeConfig.label}
                size="sm"
                variant={isSelected ? 'primary' : 'ghost'}
                onClick={() => setSelectedType(type)}
                className={isSelected ? 'shadow-lg scale-105' : 'bg-gray-light'}
              />
            )
          })}
        </div>
      </div>

      {/* Contexte (pas pour les courses) */}
      {selectedType !== 'list_item' && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-text-dark">Contexte :</p>
          <div className="flex gap-2">
            {(Object.keys(CONTEXT_CONFIG) as ItemContext[]).map((ctx) => {
              const ctxConfig = CONTEXT_CONFIG[ctx]
              const CtxIcon = ctxConfig.icon
              const isSelected = selectedContext === ctx

              return (
                <IconButton
                  key={ctx}
                  icon={<CtxIcon />}
                  label={CONTEXT_SHORT_LABELS[ctx]}
                  size="sm"
                  variant={isSelected ? 'primary' : 'ghost'}
                  onClick={() => setSelectedContext(ctx)}
                  className={isSelected ? 'shadow-lg scale-105' : 'bg-gray-light'}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {config.actions.map((actionConfig) => {
          const isDisabled = (actionConfig.requiresAI && !hasAIQuota) || isSaving

          return (
            <ActionButton
              key={actionConfig.value}
              label={isSaving && actionConfig.value === 'plan' ? 'Chargement...' : actionConfig.label}
              variant={actionConfig.variant || 'save'}
              onClick={() => !isDisabled && handleAction(selectedType, actionConfig.value)}
              disabled={isDisabled}
              fullWidth
              className="flex-1"
            />
          )
        })}

        <IconButton
          icon={<TrashIcon />}
          label="Supprimer"
          variant="danger"
          size="md"
          onClick={() => onSave(selectedType, 'delete', selectedContext)}
        />
      </div>

      {/* Panel de développement d'idée (inline) */}
      {showDevelopPanel && savedItemId && selectedType === 'idea' && (
        <IdeaDevelopPanel
          itemId={savedItemId}
          itemContent={content}
          onClose={handleDevelopClose}
          onDeveloped={handleDevelopSuccess}
        />
      )}

      {!isEmbedded && !showDevelopPanel && (
        <button
          onClick={onClose}
          className="w-full py-2 text-text-muted hover:text-text-dark font-medium"
        >
          Annuler
        </button>
      )}
    </div>
  )

  // ============================================
  // RENDER - SCHEDULE STEP
  // ============================================

  const ScheduleContent = () => (
    <div className="space-y-6">
      {/* Tâche (lecture seule) */}

      <div className="p-4 bg-mint rounded-xl border border-border">
        <p className="text-text-dark whitespace-pre-wrap">{content}</p>
      </div>

      {/* Durée estimée */}
      <DurationSelector
        value={scheduling.estimatedDuration}
        onChange={(duration) => scheduling.setDuration(duration as 15 | 30 | 60)}
        disabled={scheduling.isLoading}
      />

      <div className="border-t border-border pt-6">
        {/* Google Calendar non connecté ou session expirée */}
        {(!isCalendarConnected || scheduling.error === 'calendar_session_expired' || scheduling.error === 'calendar_not_connected') && (
          <div className="space-y-4">
            {scheduling.error === 'calendar_session_expired' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                <p className="text-orange-800 text-sm text-center">
                  Ta session Google Calendar a expiré
                </p>
              </div>
            )}
            <GoogleCalendarCTA
              onConnect={handleConnectCalendar}
              isConnecting={false}
            />
          </div>
        )}

        {/* Chargement */}
        {isCalendarConnected && scheduling.isLoading && !scheduling.error && (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-text-muted">
              Recherche des meilleurs créneaux...
            </p>
          </div>
        )}

        {/* Erreur réseau */}
        {scheduling.error === 'network_error' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center mb-4">
            <div className="text-2xl mb-2">📡</div>
            <p className="text-red-800 font-medium">Problème de connexion</p>
            <p className="text-red-600 text-sm mt-1">
              Vérifie ta connexion internet et réessaye.
            </p>
            <button
              onClick={() => scheduling.loadSlots()}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Erreur service fermé (médecin, banque, etc.) */}
        {scheduling.error === 'service_closed' && scheduling.serviceFilterInfo && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center mb-4">
            <div className="text-2xl mb-2">🏥</div>
            <p className="text-amber-800 font-medium">
              {scheduling.serviceFilterInfo.type === 'medical' && 'Les créneaux chez le médecin sont limités'}
              {scheduling.serviceFilterInfo.type === 'administrative' && 'Les services administratifs ont des horaires restreints'}
              {scheduling.serviceFilterInfo.type === 'commercial' && 'Les commerces ont des horaires d\'ouverture'}
            </p>
            <p className="text-amber-700 text-sm mt-2">
              {scheduling.serviceFilterInfo.reason}
            </p>
            <button
              onClick={() => scheduling.loadSlots(true)}
              className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition-colors"
            >
              Voir tous les créneaux quand même
            </button>
          </div>
        )}

        {/* Erreur (autres que calendar, network et service_closed) */}
        {scheduling.error && !['network_error', 'calendar_not_connected', 'calendar_session_expired', 'service_closed'].includes(scheduling.error) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-800 text-sm">{scheduling.error}</p>
          </div>
        )}

        {/* Créneaux */}
        {isCalendarConnected && !scheduling.isLoading && scheduling.bestSlot && !scheduling.error && (
          <div className="space-y-3">
            {/* Indicateur mode forcé */}
            {scheduling.isForceMode && scheduling.serviceFilterInfo && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center gap-2 text-sm">
                <span>⚠️</span>
                <span className="text-amber-700">
                  Créneaux affichés sans filtrage horaire ({scheduling.serviceFilterInfo.type === 'medical' ? 'médecin' : scheduling.serviceFilterInfo.type === 'administrative' ? 'administration' : 'commerce'})
                </span>
              </div>
            )}

            <h3 className="font-semibold text-text-dark mb-3">
              {scheduling.showAlternatives ? 'Créneaux suggérés' : 'Meilleur moment suggéré'}
            </h3>

            {/* Meilleur créneau (toujours visible) */}
            <TimeSlotCard
              slot={scheduling.bestSlot}
              rank={!scheduling.showAlternatives ? 1 : undefined}
              isSelected={
                scheduling.selectedSlot?.date === scheduling.bestSlot.date &&
                scheduling.selectedSlot?.startTime === scheduling.bestSlot.startTime
              }
              onSelect={() => scheduling.selectSlot(scheduling.bestSlot)}
            />

            {/* Créneaux alternatifs (visibles si showAlternatives) */}
            {scheduling.showAlternatives && scheduling.alternativeSlots.map((slot) => (
              <TimeSlotCard
                key={`${slot.date}-${slot.startTime}`}
                slot={slot}
                isSelected={
                  scheduling.selectedSlot?.date === slot.date &&
                  scheduling.selectedSlot?.startTime === slot.startTime
                }
                onSelect={() => scheduling.selectSlot(slot)}
              />
            ))}

            {/* Bouton "Voir plus" / "Voir moins" */}
            {scheduling.alternativeSlots.length > 0 && (
              <button
                onClick={scheduling.toggleAlternatives}
                className="w-full py-2.5 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors border border-transparent hover:border-primary/20"
              >
                {scheduling.showAlternatives ? (
                  '← Voir uniquement le meilleur'
                ) : (
                  `Voir d'autres créneaux (${scheduling.alternativeSlots.length} ${scheduling.alternativeSlots.length === 1 ? 'disponible' : 'disponibles'})`
                )}
              </button>
            )}
          </div>
        )}

        {/* Aucun créneau */}
        {isCalendarConnected && !scheduling.isLoading && !scheduling.bestSlot && !scheduling.error && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
            <p className="text-orange-800 text-sm">
              Aucun créneau disponible sur les 7 prochains jours
            </p>
            <p className="text-orange-600 text-xs mt-2">
              Essaie de modifier la durée ou tes contraintes horaires
            </p>
          </div>
        )}
      </div>

    </div>
  )

  // ============================================
  // RENDER
  // ============================================

  if (isEmbedded) {
    if (currentStep === 'organize') {
      return <OrganizeContent />
    }

    // Mode embedded + schedule : inclure les boutons d'action
    return (
      <div className="flex flex-col">
        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
          <ScheduleContent />
        </div>

        {/* Footer Actions - toujours visible en bas */}
        <div className="mt-4 pt-4 border-t border-border flex gap-3 bg-white sticky bottom-0">
          <button
            onClick={handleBack}
            className="flex-1 px-6 py-3 border-2 border-border rounded-lg font-medium text-text-dark hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>

          <button
            onClick={handleSchedule}
            disabled={!scheduling.selectedSlot || scheduling.isLoading}
            className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scheduling.isLoading ? 'Planification...' : 'Planifier'}
          </button>
        </div>
      </div>
    )
  }

  // Afficher la modal de succès après planification
  if (successData) {
    return (
      <SuccessModal
        taskContent={successData.task}
        scheduledDate={successData.date}
        onClose={handleSuccessClose}
      />
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal - positionné au-dessus du BottomNav */}
      <div className="fixed z-[60] inset-x-0 bottom-[80px] rounded-t-3xl bg-white shadow-2xl animate-slide-up" style={{ maxHeight: 'calc(100vh - 140px)' }}>
        {/* Header - hauteur fixe */}
        <div className="h-[60px] flex items-center justify-between px-4 border-b border-border bg-white rounded-t-3xl">
          {currentStep === 'schedule' ? (
            <IconButton
              icon={<ArrowLeftIcon />}
              label="Retour"
              variant="ghost"
              size="sm"
              onClick={handleBack}
            />
          ) : (
            <div className="w-10" />
          )}

          <h2 className="text-lg font-bold text-text-dark font-quicksand">
            {currentStep === 'organize' ? 'Organiser' : 'Planifier la tâche'}
          </h2>

          <IconButton
            icon={<XIcon />}
            label="Fermer"
            variant="ghost"
            size="sm"
            onClick={onClose}
          />
        </div>

        {/* Content - scrollable */}
        <div
          className="p-6 overflow-y-auto"
          style={{
            maxHeight: currentStep === 'schedule'
              ? 'calc(100vh - 300px)' // Réserve large pour header + footer + marges
              : 'calc(100vh - 220px)'
          }}
        >
          {currentStep === 'organize' ? OrganizeContent() : ScheduleContent()}
        </div>

        {/* Footer Actions - Schedule step only */}
        {currentStep === 'schedule' ? (
          <div className="p-4 border-t border-border bg-white flex gap-3">
            <button
              onClick={handleBack}
              className="flex-1 px-6 py-3 border-2 border-border rounded-lg font-medium text-text-dark hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>

            <button
              onClick={handleSchedule}
              disabled={!scheduling.selectedSlot || scheduling.isLoading}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {scheduling.isLoading ? 'Planification...' : 'Planifier'}
            </button>
          </div>
        ) : null}
      </div>
    </>
  )
}
