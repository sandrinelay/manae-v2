'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchProject,
  fetchProjectSteps,
  updateItemState
} from '@/services/items.service'
import type { Item, ItemState } from '@/types/items'
import { ArrowLeftIcon, CheckIcon, CircleIcon, ArchiveIcon, TrashIcon } from '@/components/ui/icons'
import { IconButton } from '@/components/ui/IconButton'
import { ActionButton } from '@/components/ui/ActionButton'
import { archiveItem, deleteItem } from '@/services/items.service'

// ============================================
// TYPES
// ============================================

interface ProjectWithSteps extends Item {
  steps: Item[]
}

// ============================================
// COMPOSANT
// ============================================

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isLoading: isAuthLoading } = useAuth()

  const [project, setProject] = useState<ProjectWithSteps | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const projectId = params.id as string

  // ============================================
  // CHARGEMENT DU PROJET
  // ============================================

  const loadProject = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      // 1. Charger le projet
      const projectData = await fetchProject(projectId, user.id)

      if (!projectData) {
        setError('Projet non trouvé')
        return
      }

      // 2. Charger les étapes (enfants)
      const stepsData = await fetchProjectSteps(projectId, user.id)

      setProject({
        ...projectData,
        steps: stepsData
      })
    } catch (err) {
      console.error('Erreur:', err)
      setError('Erreur lors du chargement')
    } finally {
      setIsLoading(false)
    }
  }, [projectId, user])

  useEffect(() => {
    if (isAuthLoading) return
    if (!user) {
      router.push('/login')
      return
    }
    loadProject()
  }, [isAuthLoading, user, router, loadProject, projectId])

  // ============================================
  // HANDLERS
  // ============================================

  const toggleStepComplete = useCallback(async (stepId: string, currentState: ItemState) => {
    if (!project) return

    const newState: ItemState = currentState === 'completed' ? 'active' : 'completed'

    // Mise à jour optimiste
    setProject(prev => {
      if (!prev) return null
      return {
        ...prev,
        steps: prev.steps.map(step =>
          step.id === stepId ? { ...step, state: newState } : step
        )
      }
    })

    try {
      await updateItemState(stepId, newState)
    } catch (err) {
      console.error('Erreur mise à jour:', err)
      // Rollback
      setProject(prev => {
        if (!prev) return null
        return {
          ...prev,
          steps: prev.steps.map(step =>
            step.id === stepId ? { ...step, state: currentState } : step
          )
        }
      })
    }
  }, [project])

  const handleArchive = useCallback(async () => {
    try {
      await archiveItem(projectId)
      router.push('/clarte')
    } catch (err) {
      console.error('Erreur archivage:', err)
    }
  }, [projectId, router])

  const handleDelete = useCallback(async () => {
    try {
      await deleteItem(projectId)
      router.push('/clarte')
    } catch (err) {
      console.error('Erreur suppression:', err)
    }
  }, [projectId, router])

  // ============================================
  // RENDER
  // ============================================

  if (isLoading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background p-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-muted hover:text-text-dark mb-6"
        >
          <ArrowLeftIcon className="w-6 h-6" />
          <span>Retour</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">{error || 'Projet non trouvé'}</p>
        </div>
      </div>
    )
  }

  const completedSteps = project.steps.filter(s => s.state === 'completed').length
  const totalSteps = project.steps.length
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  const metadata = project.metadata as {
    estimated_time?: string
    budget?: string | null
    motivation?: string
    original_content?: string
  } | null

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-white border-b border-border p-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-muted hover:text-text-dark"
        >
          <ArrowLeftIcon className="w-6 h-6" />
          <span>Retour</span>
        </button>
        <div className="flex items-center gap-2">
          <IconButton
            icon={<ArchiveIcon className="w-5 h-5" />}
            label="Ranger"
            variant="ghost"
            size="md"
            onClick={handleArchive}
          />
          <IconButton
            icon={<TrashIcon className="w-5 h-5" />}
            label="Supprimer"
            variant="danger"
            size="md"
            onClick={() => setShowDeleteConfirm(true)}
          />
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Titre du projet */}
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Projet</p>
          <h1 className="text-2xl font-bold text-text-dark font-quicksand">
            {project.content}
          </h1>
        </div>

        {/* Barre de progression */}
        <div className="bg-white rounded-xl p-4 border border-border">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-text-dark">
              Progression
            </span>
            <span className="text-sm text-text-muted">
              {completedSteps}/{totalSteps} étapes
            </span>
          </div>
          <div className="h-2 bg-gray-light rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Infos complémentaires */}
        {(metadata?.estimated_time || (metadata?.budget && metadata.budget !== 'null')) && (
          <div className="flex flex-wrap gap-4">
            {metadata.estimated_time && (
              <div className="bg-white rounded-xl px-4 py-3 border border-border">
                <p className="text-xs text-text-muted">Durée estimée</p>
                <p className="text-sm font-medium text-text-dark">
                  {metadata.estimated_time}
                </p>
              </div>
            )}
            {metadata.budget && metadata.budget !== 'null' && (
              <div className="bg-white rounded-xl px-4 py-3 border border-border">
                <p className="text-xs text-text-muted">Budget</p>
                <p className="text-sm font-medium text-text-dark">
                  {metadata.budget}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Message de motivation */}
        {metadata?.motivation && (
          <div className="bg-mint rounded-xl p-4 border border-primary/20">
            <p className="text-sm text-primary italic">
              &quot;{metadata.motivation}&quot;
            </p>
          </div>
        )}

        {/* Liste des étapes */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-text-dark">Étapes</h2>

          {project.steps.length === 0 ? (
            <p className="text-text-muted text-sm">Aucune étape définie</p>
          ) : (
            <ul className="space-y-2">
              {project.steps.map((step, index) => {
                const isCompleted = step.state === 'completed'
                const stepMeta = step.metadata as { step_order?: number } | null
                const order = stepMeta?.step_order || index + 1

                return (
                  <li
                    key={step.id}
                    className={`
                      flex items-start gap-3 p-4 rounded-xl border transition-all
                      ${isCompleted
                        ? 'bg-green-100 border-green-200'
                        : 'bg-white border-border hover:border-primary/30'
                      }
                    `}
                  >
                    <button
                      onClick={() => toggleStepComplete(step.id, step.state)}
                      className={`
                        w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors
                        ${isCompleted
                          ? 'bg-green-500 text-white'
                          : 'border-2 border-border text-transparent hover:border-primary hover:text-primary'
                        }
                      `}
                    >
                      {isCompleted ? <CheckIcon className="w-5 h-5" /> : <CircleIcon className="w-5 h-5" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-text-muted bg-gray-light px-2 py-0.5 rounded">
                          Étape {order}
                        </span>
                      </div>
                      <p className={`
                        text-sm
                        ${isCompleted ? 'text-text-muted line-through' : 'text-text-dark'}
                      `}>
                        {step.content}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

      </main>

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl max-w-sm mx-auto">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-text-dark">
                Supprimer ce projet ?
              </h3>
              <p className="text-sm text-text-muted">
                Le projet et toutes ses étapes seront supprimés. Cette action est irréversible.
              </p>
            </div>
            <div className="flex gap-3 p-4 border-t border-gray-100">
              <ActionButton
                label="Annuler"
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
              />
              <ActionButton
                label="Supprimer"
                variant="delete"
                onClick={handleDelete}
                className="flex-1"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
