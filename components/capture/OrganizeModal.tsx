'use client'

import { useState, useEffect } from 'react'
import type { Item, ItemType, ItemState, ItemContext, AIAnalyzedItem } from '@/types/items'

// Interface pour les items analysés par l'API (avant sauvegarde)
interface AnalyzedDisplayItem {
  content: string
  type: ItemType
  context?: ItemContext
  confidence: number
  extracted_data: {
    date?: string
    time?: string
    location?: string
    items?: string[]
  }
  suggestions: string[]
  // UI state
  id?: string
  state?: ItemState
}

interface OrganizeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function OrganizeModal({ isOpen, onClose, onSuccess }: OrganizeModalProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  const [items, setItems] = useState<AnalyzedDisplayItem[]>([])
  const [warning, setWarning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen) {
      analyzeItems()
    }
  }, [isOpen])

  const analyzeItems = async () => {
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
        if (data.error === 'No items to analyze') {
          setItems([])
          setIsAnalyzing(false)
          return
        }
        throw new Error(data.error || 'Analysis failed')
      }

      // Ajouter un ID temporaire pour le tracking UI
      const itemsWithIds = (data.items || []).map((item: AnalyzedDisplayItem, idx: number) => ({
        ...item,
        id: `temp-${idx}-${Date.now()}`
      }))

      setItems(itemsWithIds)

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

  const handleValidate = async (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    setProcessingIds(prev => new Set(prev).add(itemId))

    try {
      // Créer l'item dans la base avec state = 'active'
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: item.type,
          state: 'active',
          content: item.content,
          context: item.context,
          ai_analysis: {
            type_suggestion: item.type,
            confidence: item.confidence,
            extracted_data: item.extracted_data,
            suggestions: item.suggestions
          }
        })
      })

      if (!response.ok) throw new Error('Failed to save item')

      // Retirer de la liste
      setItems(prev => prev.filter(i => i.id !== itemId))
    } catch (error) {
      console.error('Validate error:', error)
      alert('Erreur lors de la validation')
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  const handleReject = async (itemId: string) => {
    setProcessingIds(prev => new Set(prev).add(itemId))

    try {
      // Simplement retirer de la liste (l'item captured sera archivé)
      setItems(prev => prev.filter(i => i.id !== itemId))
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  const handleCloseModal = () => {
    onSuccess()
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
                onClick={analyzeItems}
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
                  isProcessing={processingIds.has(item.id || '')}
                  onValidate={() => handleValidate(item.id || '')}
                  onReject={() => handleReject(item.id || '')}
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
              Tout valider
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
  item: AnalyzedDisplayItem
  isProcessing: boolean
  onValidate: () => void
  onReject: () => void
}

function ItemCard({ item, isProcessing, onValidate, onReject }: ItemCardProps) {
  const config = getTypeConfig(item.type)

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-xl p-4`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-8 h-8 rounded-lg ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
          {config.icon}
        </div>
        <div className="flex-1">
          <p className="text-text-dark font-medium font-quicksand">
            {item.content}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-text-muted text-xs">
              {config.label}
            </span>
            {item.context && (
              <span className="text-text-muted text-xs">
                • {getContextLabel(item.context)}
              </span>
            )}
            {item.confidence < 0.7 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                À confirmer
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Suggestions */}
      {item.suggestions.length > 0 && (
        <div className="bg-white rounded-lg p-3 mb-3 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <SparklesIconSmall />
            <span className="text-text-medium text-xs font-medium">
              Suggestion
            </span>
          </div>
          <p className="text-text-dark text-sm">
            {item.suggestions[0]}
          </p>
        </div>
      )}

      {/* Extracted data */}
      {(item.extracted_data.date || item.extracted_data.time || item.extracted_data.location) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {item.extracted_data.date && (
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
              📅 {formatDate(item.extracted_data.date)}
            </span>
          )}
          {item.extracted_data.time && (
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
              🕐 {item.extracted_data.time}
            </span>
          )}
          {item.extracted_data.location && (
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
              📍 {item.extracted_data.location}
            </span>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onValidate}
          disabled={isProcessing}
          className="flex-1 py-2 px-3 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {isProcessing ? 'En cours...' : 'Valider'}
        </button>
        <button
          onClick={onReject}
          disabled={isProcessing}
          className="py-2 px-3 rounded-lg border border-border text-text-medium text-sm font-medium hover:bg-gray-light transition-colors disabled:opacity-50"
        >
          Plus tard
        </button>
      </div>
    </div>
  )
}

// Helper functions
function getTypeConfig(type: ItemType) {
  const configs = {
    task: {
      icon: '✓',
      label: 'Tâche',
      bgColor: 'bg-mint/50',
      borderColor: 'border-primary/20',
      iconBg: 'bg-primary/10'
    },
    note: {
      icon: '📝',
      label: 'Mémo',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconBg: 'bg-yellow-100'
    },
    idea: {
      icon: '💡',
      label: 'Idée',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      iconBg: 'bg-purple-100'
    },
    list_item: {
      icon: '🛒',
      label: 'Course',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconBg: 'bg-green-100'
    }
  }
  return configs[type] || configs.task
}

function getContextLabel(context: ItemContext): string {
  const labels: Record<ItemContext, string> = {
    personal: 'Personnel',
    family: 'Famille',
    work: 'Travail',
    health: 'Santé'
  }
  return labels[context] || context
}

function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate)
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  } catch {
    return isoDate
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
