'use client'

import { ShoppingCart, Home, Users, Briefcase, Globe, X } from 'lucide-react'
import type { List, ListSlug } from '@/types/lists'

interface ShoppingListsModalProps {
  lists: List[]
  onToggle: (listId: string, currentEnabled: boolean) => void
  onClose: () => void
}

const LIST_ICONS: Record<ListSlug, React.FC<{ className?: string }>> = {
  'alimentaire': ShoppingCart,
  'maison': Home,
  'enfants': Users,
  'pro': Briefcase,
  'en-ligne': Globe
}

export function ShoppingListsModal({ lists, onToggle, onClose }: ShoppingListsModalProps) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="w-full bg-white rounded-2xl shadow-2xl max-w-lg animate-scale-in" onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-semibold text-text-dark">Mes listes d&apos;achats</h2>
            <button onClick={onClose} aria-label="Fermer" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>

          {/* Listes */}
          <div className="p-4 space-y-1">
            {lists.map((list) => {
              const isAlimentaire = list.slug === 'alimentaire'
              const Icon = LIST_ICONS[list.slug] || ShoppingCart

              return (
                <div key={list.id} className="flex items-center justify-between py-3 px-2">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-text-dark">{list.name}</p>
                      {isAlimentaire && (
                        <p className="text-xs text-text-muted">Toujours active</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => !isAlimentaire && onToggle(list.id, list.enabled)}
                    disabled={isAlimentaire}
                    aria-label={`${list.enabled ? 'Désactiver' : 'Activer'} la liste ${list.name}`}
                    className={`relative w-10 h-6 rounded-full transition-colors ${
                      list.enabled ? 'bg-primary' : 'bg-gray-200'
                    } ${isAlimentaire ? 'cursor-default opacity-60' : 'cursor-pointer'}`}
                  >
                    <span className={`absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      list.enabled ? 'translate-x-5' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
