'use client'

import { useIdeaDevelop } from '../hooks/useIdeaDevelop'
import { BLOCKER_CONFIG } from '../types'
import type { IdeaBlocker } from '../types'

// ============================================
// TYPES
// ============================================

interface IdeaDevelopPanelProps {
  itemId: string
  itemContent: string
  onClose: () => void
  onDeveloped?: () => void
}

// ============================================
// COMPOSANT
// ============================================

export function IdeaDevelopPanel({
  itemId,
  itemContent,
  onClose,
  onDeveloped
}: IdeaDevelopPanelProps) {
  const {
    currentStep,
    ideaAge,
    blockers,
    isLoading,
    error,
    result,
    setIdeaAge,
    toggleBlocker,
    develop,
    goBack
  } = useIdeaDevelop({
    itemId,
    onSuccess: onDeveloped
  })

  // Peut-on lancer le développement ?
  const canDevelop = ideaAge !== null

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-4 animate-fade-in">

      {/* ========================================
          ÉTAPE 1 : Âge de l'idée
          ======================================== */}
      {currentStep === 'age' && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-text-dark">
            Cette idée...
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setIdeaAge('fresh')}
              className="flex-1 py-3 px-4 rounded-xl border-2 border-border
                         hover:border-primary hover:bg-mint transition-all
                         text-sm font-medium text-text-dark"
            >
              Elle est toute fraîche
            </button>
            <button
              onClick={() => setIdeaAge('old')}
              className="flex-1 py-3 px-4 rounded-xl border-2 border-border
                         hover:border-primary hover:bg-mint transition-all
                         text-sm font-medium text-text-dark"
            >
              Elle traîne depuis un moment
            </button>
          </div>
        </div>
      )}

      {/* ========================================
          ÉTAPE 2 : Blocages (si old) + Bouton créer
          ======================================== */}
      {currentStep === 'blockers' && (
        <div className="space-y-4">
          {/* Récap du choix d'âge */}
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <span>Cette idée...</span>
            <span className="px-2 py-1 bg-mint rounded-lg text-primary font-medium">
              {ideaAge === 'fresh' ? 'Toute fraîche' : 'Depuis un moment'}
            </span>
            <button
              onClick={goBack}
              className="text-xs text-text-muted hover:text-primary underline ml-auto"
            >
              Modifier
            </button>
          </div>

          {/* Chips blocages (seulement si idée ancienne) */}
          {ideaAge === 'old' && (
            <div className="space-y-2">
              <p className="text-sm text-text-muted">
                Qu'est-ce qui la freine ? <span className="opacity-60">(optionnel)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(BLOCKER_CONFIG) as [IdeaBlocker, typeof BLOCKER_CONFIG[IdeaBlocker]][]).map(
                  ([key, config]) => {
                    const isSelected = blockers.includes(key)
                    return (
                      <button
                        key={key}
                        onClick={() => toggleBlocker(key)}
                        className={`
                          px-3 py-2 rounded-full text-sm font-medium transition-all
                          ${isSelected
                            ? 'bg-primary text-white'
                            : 'bg-gray-light text-text-dark hover:bg-border'
                          }
                        `}
                      >
                        {config.emoji} {config.label}
                      </button>
                    )
                  }
                )}
              </div>
            </div>
          )}

          {/* Message d'erreur */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error.message}</p>
            </div>
          )}

          {/* Bouton créer le projet */}
          <button
            onClick={develop}
            disabled={!canDevelop || isLoading}
            className="w-full py-3 px-4 bg-primary text-white rounded-xl
                       font-medium hover:opacity-90 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Créer mon projet
          </button>
        </div>
      )}

      {/* ========================================
          ÉTAPE 3 : Loading
          ======================================== */}
      {currentStep === 'loading' && (
        <div className="py-8 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent
                          rounded-full animate-spin mx-auto" />
          <p className="text-sm text-text-muted">
            Manae structure ton projet...
          </p>
        </div>
      )}

      {/* ========================================
          ÉTAPE 4 : Résultat
          ======================================== */}
      {currentStep === 'result' && result && (
        <div className="space-y-4">
          {/* Badge succès */}
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50
                          p-3 rounded-lg border border-green-200">
            <span>Projet créé avec {result.steps.length} étapes</span>
          </div>

          {/* Titre raffiné */}
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide mb-1">
              Projet
            </p>
            <p className="font-semibold text-text-dark text-lg">
              {result.project.refined_title}
            </p>
          </div>

          {/* Aperçu des étapes (max 3) */}
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2">
              Étapes
            </p>
            <ul className="space-y-2">
              {result.steps.slice(0, 3).map((step, index) => (
                <li
                  key={step.id}
                  className="flex items-start gap-2 text-sm text-text-medium"
                >
                  <span className="w-5 h-5 rounded-full bg-gray-light text-text-muted
                                   flex items-center justify-center text-xs flex-shrink-0">
                    {index + 1}
                  </span>
                  <span>{step.content}</span>
                </li>
              ))}
              {result.steps.length > 3 && (
                <li className="text-sm text-text-muted pl-7">
                  +{result.steps.length - 3} autres étapes...
                </li>
              )}
            </ul>
          </div>

          {/* Infos complémentaires */}
          <div className="flex flex-wrap gap-4 text-sm text-text-muted">
            {result.project.estimated_time && (
              <span className="flex items-center gap-1">
                <span>{result.project.estimated_time}</span>
              </span>
            )}
            {result.project.budget && result.project.budget !== 'null' && (
              <span className="flex items-center gap-1">
                <span>{result.project.budget}</span>
              </span>
            )}
          </div>

          {/* Motivation */}
          {result.project.motivation && (
            <div className="bg-mint p-4 rounded-xl">
              <p className="text-sm text-primary italic">
                "{result.project.motivation}"
              </p>
            </div>
          )}

          {/* Actions finales */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-border rounded-xl
                         text-sm font-medium text-text-dark hover:bg-gray-light
                         transition-colors"
            >
              Fermer
            </button>
            <a
              href={`/projects/${result.project.id}`}
              className="flex-1 py-3 px-4 bg-primary text-white rounded-xl
                         text-sm font-medium text-center hover:opacity-90
                         transition-colors"
            >
              Voir le projet
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
