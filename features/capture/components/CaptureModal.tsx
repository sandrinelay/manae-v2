'use client'

import { useState, useEffect, type ReactNode } from 'react'
import type { ItemType } from '@/types/items'
import type { CaptureResult } from '@/services/capture'
import { useScheduling } from '@/features/schedule/hooks/useScheduling'
import { DurationSelector } from '@/features/schedule/components/DurationSelector'
import { TimeSlotCard } from '@/features/schedule/components/TimeSlotCard'
import { SuccessModal, formatScheduledDate } from '@/features/schedule/components/SuccessModal'
import GoogleCalendarCTA from '@/components/capture/GoogleCalendarCTA'
import { useGoogleCalendarStatus } from '@/hooks/useGoogleCalendarStatus'
import { saveItem } from '@/services/capture'
import type { Mood as ItemMood } from '@/types/items'

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
  onSave: (type: ItemType, action: ActionType) => void
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
      { label: 'Planifier', value: 'plan', variant: 'secondary' }
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

  // État de la modal
  const [currentStep, setCurrentStep] = useState<ModalStep>('organize')
  const [selectedType, setSelectedType] = useState<ItemType>(captureResult.suggestedType || 'task')
  const [savedItemId, setSavedItemId] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successData, setSuccessData] = useState<{ task: string; date: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Google Calendar status
  const { isConnected: isCalendarConnected } = useGoogleCalendarStatus()

  // Convertir mood pour le scheduling
  const schedulingMood = mood === 'energetic' ? 'energetic' : mood === 'tired' ? 'tired' : 'neutral'

  // Hook scheduling
  const scheduling = useScheduling({
    itemId: savedItemId || '',
    taskContent: content,
    mood: schedulingMood
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
    window.location.href = '/onboarding/step4'
  }

  const handleAction = (type: ItemType, action: ActionType) => {
    if (action === 'plan' && type === 'task') {
      handlePlanAction()
    } else {
      onSave(type, action)
    }
  }

  const config = TYPE_CONFIG[selectedType]

  // ============================================
  // RENDER - ORGANIZE STEP
  // ============================================

  const OrganizeContent = () => (
    <div className="space-y-4">
      {/* Indicateur IA */}
      {captureResult.aiUsed && captureResult.suggestedType && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-primary">IA suggère :</span>
          <span className="font-medium text-primary flex items-center gap-1">
            <span className="w-5 h-5">{TYPE_CONFIG[captureResult.suggestedType].icon}</span>
            {TYPE_CONFIG[captureResult.suggestedType].label}
          </span>
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
          onClick={() => onSave(selectedType, 'delete')}
          className="p-3 rounded-xl border-2 border-red-200 text-red-500 hover:bg-red-50 transition-all"
          title="Supprimer"
        >
          <TrashIcon />
        </button>
      </div>

      {!isEmbedded && (
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
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-text-dark font-medium">"{content}"</p>
      </div>

      {/* Durée estimée */}
      <DurationSelector
        value={scheduling.estimatedDuration}
        onChange={(duration) => {
          scheduling.setDuration(duration as 15 | 30 | 60)
          if (isCalendarConnected) {
            scheduling.loadSlots()
          }
        }}
        aiSuggested={scheduling.estimatedDuration}
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

        {/* Erreur (autres que calendar) */}
        {scheduling.error && scheduling.error !== 'calendar_not_connected' && scheduling.error !== 'calendar_session_expired' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-800 text-sm">{scheduling.error}</p>
          </div>
        )}

        {/* Créneaux */}
        {isCalendarConnected && !scheduling.isLoading && scheduling.slots.length > 0 && !scheduling.error && (
          <div className="space-y-3">
            <h3 className="font-semibold text-text-dark mb-3">
              Créneaux suggérés
            </h3>

            {scheduling.slots.map((slot, index) => (
              <TimeSlotCard
                key={`${slot.date}-${slot.startTime}`}
                slot={slot}
                rank={(index + 1) as 1 | 2 | 3}
                isSelected={
                  scheduling.selectedSlot?.date === slot.date &&
                  scheduling.selectedSlot?.startTime === slot.startTime
                }
                onSelect={() => scheduling.selectSlot(slot)}
              />
            ))}
          </div>
        )}

        {/* Aucun créneau */}
        {isCalendarConnected && !scheduling.isLoading && scheduling.slots.length === 0 && !scheduling.error && (
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

      {/* Actions */}
      <div className="flex gap-3 pt-4">
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

      {/* Modal */}
      <div className={`
        fixed z-50 bg-white shadow-2xl animate-slide-up
        ${currentStep === 'schedule'
          ? 'inset-4 rounded-2xl overflow-hidden'
          : 'inset-x-0 bottom-20 rounded-t-3xl max-w-2xl mx-auto'
        }
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
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
        <div className={`
          p-6 overflow-y-auto
          ${currentStep === 'schedule' ? 'max-h-[calc(100vh-8rem)]' : 'max-h-[70vh]'}
        `}>
          {currentStep === 'organize' ? OrganizeContent() : ScheduleContent()}
        </div>
      </div>
    </>
  )
}
