'use client'

import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { ChevronRightIcon } from '@/components/ui/icons'
import { ShoppingListsModal } from './ShoppingListsModal'
import type { List } from '@/types/lists'

interface ShoppingListsSectionProps {
  lists: List[]
  onToggle: (listId: string, currentEnabled: boolean) => void
  externalModalControl?: boolean
  onShowModal?: () => void
}

export function ShoppingListsSection({
  lists,
  onToggle,
  externalModalControl = false,
  onShowModal
}: ShoppingListsSectionProps) {
  const [showModal, setShowModal] = useState(false)

  if (lists.length === 0) return null

  const activeCount = lists.filter(l => l.enabled).length
  const summary = `${activeCount} liste${activeCount > 1 ? 's' : ''} sur ${lists.length} active${activeCount > 1 ? 's' : ''}`

  const handleOpen = () => {
    if (externalModalControl && onShowModal) {
      onShowModal()
    } else {
      setShowModal(true)
    }
  }

  return (
    <>
      <section className="bg-white rounded-2xl overflow-hidden">
        <h2 className="px-4 pt-4 pb-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
          Mes listes d&apos;achats
        </h2>

        <button
          onClick={handleOpen}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="text-sm text-text-muted">Listes actives</p>
              <p className="text-text-dark text-sm">{summary}</p>
            </div>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-text-muted" />
        </button>
      </section>

      {!externalModalControl && showModal && (
        <ShoppingListsModal
          lists={lists}
          onToggle={onToggle}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
