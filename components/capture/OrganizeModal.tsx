'use client'

import { useState, useEffect } from 'react'
import { Item } from '@/types'

interface OrganizeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void // Callback pour rafraîchir le count
}

export default function OrganizeModal({ isOpen, onClose, onSuccess }: OrganizeModalProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  const [items, setItems] = useState<Item[]>([])
  const [warning, setWarning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [developingIds, setDevelopingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen) {
      analyzeThoughts()
    }
  }, [isOpen])

  const analyzeThoughts = async () => {
    setIsAnalyzing(true)
    setWarning(null)
    setError(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'No thoughts to analyze') {
          setItems([])
          setIsAnalyzing(false)
          return
        }
        throw new Error(data.error || 'Analysis failed')
      }

      setItems(data.items || [])

      if (data.warning) {
        setWarning(data.warning)
      }
    } catch (err) {
      console.error('Analysis error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'analyse'
      setError(errorMessage)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDevelopIdea = async (itemId: string) => {
    setDevelopingIds(prev => new Set(prev).add(itemId))

    try {
      const response = await fetch('/api/develop-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId })
      })

      if (!response.ok) throw new Error('Development failed')

      const data = await response.json()

      // Mettre à jour l'item dans la liste
      setItems(prev => prev.map(item =>
        item.id === itemId ? data.item : item
      ))

      // Auto-expand le projet développé
      setExpandedProjects(prev => new Set(prev).add(itemId))
    } catch (error) {
      console.error('Development error:', error)
      alert('Erreur lors du développement de l\'idée.')
    } finally {
      setDevelopingIds(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleValidate = async (itemId: string) => {
    try {
      const response = await fetch('/api/items/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          updates: { status: 'ready' }
        })
      })

      if (!response.ok) throw new Error('Validate failed')

      // Mettre à jour localement
      setItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, status: 'ready' as const } : item
      ))
    } catch (error) {
      console.error('Validate error:', error)
    }
  }

  const handleReject = async (itemId: string) => {
    try {
      const response = await fetch('/api/items/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          updates: { status: 'rejected' }
        })
      })

      if (!response.ok) throw new Error('Reject failed')

      // Retirer de la liste
      setItems(prev => prev.filter(item => item.id !== itemId))
    } catch (error) {
      console.error('Reject error:', error)
    }
  }

  const handleCloseModal = () => {
    onSuccess() // Rafraîchir le count de thoughts
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl animate-slideUp flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-dark font-quicksand">
            Organisation de tes captures
          </h2>
          <button
            onClick={handleCloseModal}
            className="w-8 h-8 rounded-full hover:bg-gray-light flex items-center justify-center transition-colors"
            aria-label="Fermer"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
              <p className="text-sm text-red-800 font-medium mb-2">❌ Erreur</p>
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={analyzeThoughts}
                className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Warning si fallback */}
          {warning && !error && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4">
              <p className="text-sm text-yellow-800">⚠️ {warning}</p>
            </div>
          )}

          {isAnalyzing ? (
            <AnalyzingLoader />
          ) : error ? null : items.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-muted">Aucune capture à organiser</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  isExpanded={expandedProjects.has(item.id)}
                  isDeveloping={developingIds.has(item.id)}
                  onToggleExpand={() => toggleProject(item.id)}
                  onDevelopIdea={handleDevelopIdea}
                  onValidate={handleValidate}
                  onReject={handleReject}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isAnalyzing && items.length > 0 && (
          <div className="px-6 py-4 border-t border-border flex gap-3">
            <button
              onClick={handleCloseModal}
              className="flex-1 py-3 px-4 rounded-lg border-2 border-border hover:bg-gray-light transition-colors font-medium text-text-dark font-quicksand"
            >
              Fermer
            </button>
            <button
              className="flex-1 py-3 px-4 rounded-lg bg-primary hover:bg-primary-dark transition-colors font-semibold text-white font-quicksand"
            >
              Tout planifier
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function AnalyzingLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
      <p className="text-text-medium font-medium font-quicksand">
        Analyse en cours...
      </p>
      <p className="text-text-muted text-sm mt-1">
        L'IA organise tes captures
      </p>
    </div>
  )
}

interface ItemCardProps {
  item: Item
  isExpanded: boolean
  isDeveloping: boolean
  onToggleExpand: () => void
  onDevelopIdea: (id: string) => void
  onValidate: (id: string) => void
  onReject: (id: string) => void
}

function ItemCard({ item, isExpanded, isDeveloping, onToggleExpand, onDevelopIdea, onValidate, onReject }: ItemCardProps) {
  // Idée floue → afficher card spéciale pour développer
  if (item.status === 'idea') {
    return (
      <IdeaCard
        item={item}
        isDeveloping={isDeveloping}
        onDevelop={() => onDevelopIdea(item.id)}
        onReject={() => onReject(item.id)}
      />
    )
  }

  // Projet développé → afficher étapes
  if (item.status === 'project') {
    return (
      <ProjectCard
        item={item}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        onValidate={() => onValidate(item.id)}
        onReject={() => onReject(item.id)}
      />
    )
  }

  // Task/Course/Note ready → cards classiques
  if (item.type === 'course') {
    return <CourseCard item={item} />
  }

  if (item.type === 'note') {
    return <NoteCard item={item} />
  }

  // Default: task ready
  return (
    <TaskCard
      item={item}
      onValidate={() => onValidate(item.id)}
      onReject={() => onReject(item.id)}
    />
  )
}

interface IdeaCardProps {
  item: Item
  isDeveloping: boolean
  onDevelop: () => void
  onReject: () => void
}

function IdeaCard({ item, isDeveloping, onDevelop, onReject }: IdeaCardProps) {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
          💡
        </div>
        <div className="flex-1">
          <p className="text-text-dark font-semibold font-quicksand mb-1">
            {item.text}
          </p>
          <p className="text-text-muted text-xs">
            Idée floue • {getCategoryLabel(item.category)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-3 mb-3 border border-purple-200">
        <p className="text-text-medium text-sm">
          Cette idée peut être développée en projet concret avec des étapes.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onDevelop}
          disabled={isDeveloping}
          className="flex-1 py-2 px-3 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isDeveloping ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Développement...
            </>
          ) : (
            <>
              <SparklesIconSmall />
              Développer
            </>
          )}
        </button>
        <button
          onClick={onReject}
          className="py-2 px-3 rounded-lg border border-border text-text-medium text-sm font-medium hover:bg-gray-light transition-colors"
        >
          Refuser
        </button>
      </div>
    </div>
  )
}

interface ProjectCardProps {
  item: Item
  isExpanded: boolean
  onToggleExpand: () => void
  onValidate: () => void
  onReject: () => void
}

function ProjectCard({ item, isExpanded, onToggleExpand, onValidate, onReject }: ProjectCardProps) {
  const steps = item.project_steps || []

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
          📋
        </div>
        <div className="flex-1">
          <p className="text-text-dark font-semibold font-quicksand mb-1">
            {item.refined_text || item.text}
          </p>
          <p className="text-text-muted text-xs">
            Projet • {getCategoryLabel(item.category)}
          </p>
        </div>
      </div>

      {/* Motivation */}
      {item.project_motivation && (
        <div className="bg-purple-100/50 rounded-lg p-3 mb-3">
          <p className="text-purple-700 text-sm italic">
            "{item.project_motivation}"
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg p-3 mb-3 border border-purple-200">
        <div className="flex items-center justify-between mb-2">
          <p className="text-text-medium text-sm font-medium">
            Étapes ({steps.length})
          </p>
          {item.project_time && (
            <span className="text-xs text-text-muted">
              ⏱ {item.project_time}
            </span>
          )}
        </div>

        {isExpanded ? (
          <div className="space-y-2">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs text-purple-600 font-medium">{idx + 1}</span>
                </div>
                <span className="text-text-dark text-sm">{step}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-muted text-sm">
            {steps.slice(0, 2).join(' → ')}...
          </p>
        )}

        {item.project_budget && (
          <div className="mt-2 pt-2 border-t border-border">
            <span className="text-xs text-text-muted">
              Budget estimé : <span className="text-primary font-medium">{item.project_budget}</span>
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onToggleExpand}
          className="flex-1 py-2 px-3 rounded-lg bg-white border border-purple-200 text-text-dark text-sm font-medium hover:bg-purple-50 transition-colors"
        >
          {isExpanded ? 'Réduire' : 'Voir les étapes'}
        </button>
        <button
          onClick={onValidate}
          className="flex-1 py-2 px-3 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors"
        >
          Valider
        </button>
        <button
          onClick={onReject}
          className="py-2 px-3 rounded-lg border border-border text-text-medium text-sm font-medium hover:bg-gray-light transition-colors"
        >
          Refuser
        </button>
      </div>
    </div>
  )
}

interface TaskCardProps {
  item: Item
  onValidate: () => void
  onReject: () => void
}

function TaskCard({ item, onValidate, onReject }: TaskCardProps) {
  return (
    <div className="bg-mint/50 border border-primary/20 rounded-xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-5 h-5 rounded border-2 border-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-text-dark font-medium font-quicksand">
            {item.text}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-text-muted text-xs">
              {getCategoryLabel(item.category)}
            </span>
            {item.priority && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityStyle(item.priority)}`}>
                {getPriorityLabel(item.priority)}
              </span>
            )}
          </div>
        </div>
      </div>

      {item.suggested_slot && (
        <div className="bg-white rounded-lg p-3 mb-3 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <SparklesIconSmall />
            <span className="text-text-medium text-xs font-medium">
              Suggestion
            </span>
          </div>
          <p className="text-text-dark text-sm font-medium">
            {formatSlot(item.suggested_slot)}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onValidate}
          className="flex-1 py-2 px-3 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          Planifier
        </button>
        <button
          onClick={onReject}
          className="py-2 px-3 rounded-lg border border-border text-text-medium text-sm font-medium hover:bg-gray-light transition-colors"
        >
          Plus tard
        </button>
      </div>
    </div>
  )
}

function CourseCard({ item }: { item: Item }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
          🛒
        </div>
        <div className="flex-1">
          <p className="text-text-dark font-medium font-quicksand">
            {item.text}
          </p>
          <p className="text-text-muted text-xs mt-1">
            Course
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-3 border border-green-200">
        <div className="flex items-center gap-2">
          <CheckIconSmall />
          <span className="text-text-dark text-sm">
            Ajouté à ta liste de courses
          </span>
        </div>
      </div>
    </div>
  )
}

function NoteCard({ item }: { item: Item }) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
          📝
        </div>
        <div className="flex-1">
          <p className="text-text-dark font-medium font-quicksand">
            {item.text}
          </p>
          <p className="text-text-muted text-xs mt-1">
            Mémo
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-3 border border-yellow-200">
        <div className="flex items-center gap-2">
          <CheckIconSmall />
          <span className="text-text-dark text-sm">
            Enregistré dans Mémos
          </span>
        </div>
      </div>
    </div>
  )
}

// Helper functions
function getCategoryLabel(category: string | null): string {
  const labels: Record<string, string> = {
    work: 'Travail',
    personal: 'Personnel',
    kids: 'Enfants',
    admin: 'Admin',
    home: 'Maison',
    other: 'Autre'
  }
  return labels[category || 'other'] || 'Autre'
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    high: 'Urgent',
    medium: 'Normal',
    low: 'Peut attendre'
  }
  return labels[priority] || ''
}

function getPriorityStyle(priority: string): string {
  const styles: Record<string, string> = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-gray-100 text-gray-600'
  }
  return styles[priority] || ''
}

function formatSlot(slot: { start: string; end: string; duration: number } | null): string {
  if (!slot) return ''
  try {
    const start = new Date(slot.start)
    const day = start.toLocaleDateString('fr-FR', { weekday: 'long' })
    const time = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    return `${day} à ${time} (${slot.duration} min)`
  } catch {
    return ''
  }
}

// Icons
function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function SparklesIconSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  )
}

function CheckIconSmall() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-600">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
