'use client'

import { useState, useRef, useEffect } from 'react'
import { Item } from '@/types/items'
import {
  SHOPPING_CATEGORY_CONFIG,
  SHOPPING_CATEGORIES,
  ShoppingCategory
} from '@/config/shopping-categories'
import {
  ShoppingIcon,
  XIcon,
  EditIcon,
  TrashIcon,
  CheckIcon
} from '@/components/ui/icons'
import { IconButton } from '@/components/ui/IconButton'
import { ActionButton } from '@/components/ui/ActionButton'

interface ShoppingItemModalProps {
  item: Item
  onClose: () => void
  onEdit: (id: string, content: string, category: ShoppingCategory) => void
  onDelete: (id: string) => void
  onToggle: (id: string) => void
}

export function ShoppingItemModal({
  item,
  onClose,
  onEdit,
  onDelete,
  onToggle
}: ShoppingItemModalProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [editContent, setEditContent] = useState(item.content)
  const [editCategory, setEditCategory] = useState<ShoppingCategory>(
    (item.shopping_category as ShoppingCategory) || 'other'
  )
  const inputRef = useRef<HTMLInputElement>(null)

  const isCompleted = item.state === 'completed'
  const category = (item.shopping_category || 'other') as ShoppingCategory
  const categoryConfig = SHOPPING_CATEGORY_CONFIG[category]
  const CategoryIcon = categoryConfig.icon

  // Focus input en mode édition
  useEffect(() => {
    if (isEditMode && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditMode])

  const handleSave = () => {
    const trimmedContent = editContent.trim()
    if (trimmedContent) {
      onEdit(item.id, trimmedContent, editCategory)
      setIsEditMode(false)
    }
  }

  const handleCancel = () => {
    setEditContent(item.content)
    setEditCategory((item.shopping_category as ShoppingCategory) || 'other')
    setIsEditMode(false)
  }

  const handleDelete = () => {
    onDelete(item.id)
    onClose()
  }

  const handleToggle = () => {
    onToggle(item.id)
    onClose()
  }

  const isContentValid = editContent.trim().length > 0
  const hasChanges = editContent !== item.content ||
    editCategory !== ((item.shopping_category as ShoppingCategory) || 'other')

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={isEditMode ? undefined : onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl max-w-lg mx-auto animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2 text-primary">
            <ShoppingIcon className="w-5 h-5" />
            <span className="font-medium">
              {isEditMode ? 'Modifier l\'article' : 'Article'}
            </span>
          </div>
          <button
            onClick={isEditMode ? handleCancel : onClose}
            aria-label={isEditMode ? 'Annuler' : 'Fermer'}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XIcon className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-4">
          {isEditMode ? (
            <>
              {/* Input éditable */}
              <input
                ref={inputRef}
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isContentValid && hasChanges) {
                    handleSave()
                  }
                }}
                className="input-field text-lg"
                placeholder="Nom de l'article..."
              />

              {/* Sélecteur de catégorie */}
              <div className="mt-4">
                <p className="text-sm text-text-muted mb-2">Catégorie</p>
                <div className="flex flex-wrap gap-2">
                  {SHOPPING_CATEGORIES.map((cat) => {
                    const catConfig = SHOPPING_CATEGORY_CONFIG[cat]
                    const CatIcon = catConfig.icon
                    const isSelected = editCategory === cat

                    return (
                      <button
                        key={cat}
                        onClick={() => setEditCategory(cat)}
                        className={`
                          flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors
                          ${isSelected
                            ? `${catConfig.bgClass} ${catConfig.colorClass} border-2 border-current`
                            : 'bg-gray-100 text-text-muted border-2 border-transparent hover:bg-gray-200'
                          }
                        `}
                      >
                        <CatIcon className="w-4 h-4" />
                        <span>{catConfig.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Affichage lecture seule */}
              <p className={`typo-modal-content ${isCompleted ? 'line-through text-text-muted' : ''}`}>
                {item.content}
              </p>

              <div className={`flex items-center gap-1.5 text-sm mt-4 ${categoryConfig.colorClass}`}>
                <CategoryIcon className="w-4 h-4" />
                <span>{categoryConfig.label}</span>
                {isCompleted && (
                  <>
                    <span className="text-text-muted">•</span>
                    <span className="text-text-muted">Acheté</span>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t border-border">
          {isEditMode ? (
            <>
              <ActionButton
                label="Annuler"
                variant="secondary"
                onClick={handleCancel}
                className="flex-1"
              />
              <ActionButton
                label="Enregistrer"
                variant="save"
                onClick={handleSave}
                disabled={!isContentValid || !hasChanges}
                className="flex-1"
              />
            </>
          ) : (
            <>
              {/* Acheté / Non acheté */}
              <ActionButton
                label={isCompleted ? 'Non acheté' : 'Acheté'}
                icon={<CheckIcon className="w-5 h-5" />}
                variant={isCompleted ? 'secondary' : 'done'}
                onClick={handleToggle}
                className="flex-1"
              />

              {/* Modifier */}
              <ActionButton
                label="Modifier"
                icon={<EditIcon className="w-5 h-5" />}
                variant="secondary"
                onClick={() => setIsEditMode(true)}
                className="flex-1"
              />

              {/* Supprimer */}
              <IconButton
                icon={<TrashIcon className="w-5 h-5" />}
                label="Supprimer"
                variant="danger"
                size="md"
                onClick={handleDelete}
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}
