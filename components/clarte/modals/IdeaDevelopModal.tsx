'use client'

import { Item } from '@/types/items'
import { XIcon } from '@/components/ui/icons'
import { IdeaDevelopPanel } from '@/features/ideas/components/IdeaDevelopPanel'

interface IdeaDevelopModalProps {
  idea: Item
  onClose: () => void
  onDeveloped: () => void
}

export function IdeaDevelopModal({ idea, onClose, onDeveloped }: IdeaDevelopModalProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl max-w-lg mx-auto animate-scale-in max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-border rounded-t-2xl">
          <div className="flex items-center gap-2 text-primary">
            <span className="text-xl">✨</span>
            <span className="font-medium">Développer l'idée</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XIcon className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Contenu de l'idée */}
        <div className="p-4">
          <div className="bg-yellow-50 rounded-xl p-4 mb-4">
            <p className="text-text-dark">{idea.content}</p>
          </div>

          {/* Wizard de développement */}
          <IdeaDevelopPanel
            itemId={idea.id}
            itemContent={idea.content || ''}
            onClose={onClose}
            onDeveloped={onDeveloped}
          />
        </div>
      </div>
    </>
  )
}
