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

interface CaptureModalProps {
  content: string
  captureResult: CaptureResult
  mood: Mood | null
  userId: string
  onSave: (type: ItemType, action: ActionType, context?: ItemContext) => void
  onClose: () => void
  onSuccess?: () => void
  isEmbedded?: boolean
}

export type ActionType = 'save' | 'plan' | 'develop' | 'add_to_list' | 'delete'

interface ActionButton {
  label: string
  value: ActionType
  requiresAI?: boolean
  variant?: 'primary' | 'secondary'
}

// ============================================
// ICÔNES SVG
// ============================================

const TaskIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
)

const NoteIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

const ShoppingIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)

const IdeaIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M5 12L12 19M5 12L12 5" />
  </svg>
)

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6L18 18" />
  </svg>
)

// Icônes contexte (même style que les types)
const PersonalIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
)

const FamilyIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)

const WorkIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
)

const HealthIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
)

const OtherIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
  </svg>
)

// ============================================
// CONFIGURATION
// ============================================

const TYPE_CONFIG: Record<ItemType, {
  icon: ReactNode
  label: string
  actions: ActionButton[]
}> = {
  task: {
    icon: <TaskIcon />,
    label: 'Tâche',
    actions: [
      { label: 'Enregistrer', value: 'save', variant: 'primary' },
      { label: 'Planifier', value: 'plan', variant: 'secondary', requiresAI: true }
    ]
  },
  note: {
    icon: <NoteIcon />,
    label: 'Note',
    actions: [
      { label: 'Ajouter', value: 'save', variant: 'primary' }
    ]
  },
  list_item: {
    icon: <ShoppingIcon />,
    label: 'Course',
    actions: [
      { label: 'Ajouter', value: 'add_to_list', variant: 'primary' }
    ]
  },
  idea: {
    icon: <IdeaIcon />,
    label: 'Idée',
    actions: [
      { label: 'Enregistrer', value: 'save', variant: 'primary' },
      { label: 'Développer', value: 'develop', variant: 'secondary', requiresAI: true }
    ]
  }
}

const CONTEXT_CONFIG: Record<ItemContext, { icon: ReactNode; label: string }> = {
  personal: { icon: <PersonalIcon />, label: 'Perso' },
  family: { icon: <FamilyIcon />, label: 'Famille' },
  work: { icon: <WorkIcon />, label: 'Travail' },
  health: { icon: <HealthIcon />, label: 'Santé' },
  other: { icon: <OtherIcon />, label: 'Autre' }
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
  isEmbedded = false
}: CaptureModalProps) {
  const hasAIQuota = !captureResult.quotaExceeded

  // Contexte suggéré par l'IA
  const suggestedContext = (captureResult.aiAnalysis?.extracted_data?.context as ItemContext) || 'personal'

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
    const planningContext = {
      itemId: savedItemId,
      content,
      mood,
      captureResult,
      returnTo: 'schedule'
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
            <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
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
              <span className="w-5 h-5">{TYPE_CONFIG[captureResult.suggestedType].icon}</span>
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

            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`
                  flex items-center justify-center p-3 rounded-xl transition-all
                  ${isSelected
                    ? 'bg-primary text-white shadow-lg scale-105'
                    : 'bg-gray-light text-text-muted hover:bg-border'
                  }
                `}
                title={typeConfig.label}
              >
                {typeConfig.icon}
              </button>
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
              const isSelected = selectedContext === ctx

              return (
                <button
                  key={ctx}
                  onClick={() => setSelectedContext(ctx)}
                  className={`
                    flex items-center justify-center p-3 rounded-xl transition-all
                    ${isSelected
                      ? 'bg-primary text-white shadow-lg scale-105'
                      : 'bg-gray-light text-text-muted hover:bg-border'
                    }
                  `}
                  title={ctxConfig.label}
                >
                  {ctxConfig.icon}
                </button>
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
            <button
              key={actionConfig.value}
              onClick={() => !isDisabled && handleAction(selectedType, actionConfig.value)}
              disabled={isDisabled}
              className={`
                flex-1 py-3 px-4 rounded-xl font-medium transition-all
                ${actionConfig.variant === 'primary'
                  ? 'bg-primary text-white hover:opacity-90'
                  : 'border-2 border-border text-text-dark hover:border-primary hover:text-primary'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isSaving && actionConfig.value === 'plan' ? 'Chargement...' : actionConfig.label}
            </button>
          )
        })}

        <button
          onClick={() => onSave(selectedType, 'delete', selectedContext)}
          className="p-3 rounded-xl border-2 border-red-200 text-red-500 hover:bg-red-50 transition-all"
          title="Supprimer"
        >
          <TrashIcon />
        </button>
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
    return currentStep === 'organize' ? <OrganizeContent /> : <ScheduleContent />
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
      <div className="fixed z-50 bg-white shadow-2xl animate-slide-up flex flex-col inset-x-0 bottom-[80px] rounded-t-3xl" style={{ maxHeight: 'calc(100vh - 140px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          {currentStep === 'schedule' ? (
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <BackIcon />
            </button>
          ) : (
            <div className="w-10" />
          )}

          <h2 className="text-lg font-bold text-text-dark font-quicksand">
            {currentStep === 'organize' ? 'Organiser' : 'Planifier la tâche'}
          </h2>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {currentStep === 'organize' ? OrganizeContent() : ScheduleContent()}
        </div>

        {/* Footer Actions - Schedule step only */}
        {currentStep === 'schedule' && (
          <div className="flex gap-3 p-4 border-t border-border bg-white shrink-0">
            <button
              onClick={handleBack}
              className="flex-1 px-6 py-3 border-2 border-border rounded-lg font-medium text-text-dark hover:bg-gray-50 transition-colors"
            >
              Retour
            </button>

            <button
              onClick={handleSchedule}
              disabled={!scheduling.selectedSlot || scheduling.isLoading}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {scheduling.isLoading ? 'Planification...' : 'Planifier'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
