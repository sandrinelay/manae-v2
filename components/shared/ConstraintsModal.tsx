'use client'

import { useState } from 'react'
import { XIcon, PlusIcon } from '@/components/ui/icons'
import { ConstraintCard } from '@/components/ui/ConstraintCard'
import { ConstraintForm } from '@/components/ui/ConstraintForm'
import { ConflictModal } from '@/components/ui/ConflictModal'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { ActionButton } from '@/components/ui/ActionButton'
import { detectConflict } from '@/utils/conflictDetector'
import type { Constraint } from '@/types'
import { generateUUID } from '@/lib/utils/uuid'

interface ConstraintsModalProps {
  constraints: Constraint[]
  onClose: () => void
  onSave: (constraints: Constraint[]) => Promise<void>
}

export function ConstraintsModal({
  constraints: initialConstraints,
  onClose,
  onSave
}: ConstraintsModalProps) {
  const [constraints, setConstraints] = useState<Constraint[]>(initialConstraints)
  const [showForm, setShowForm] = useState(false)
  const [editingConstraint, setEditingConstraint] = useState<Constraint | undefined>()
  const [pendingConstraint, setPendingConstraint] = useState<Omit<Constraint, 'id'> | null>(null)
  const [conflictInfo, setConflictInfo] = useState<{ constraint: Constraint; days: string[] } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleAddConstraint = (data: Omit<Constraint, 'id'>) => {
    const conflict = detectConflict(data, constraints)

    if (conflict.hasConflict && conflict.conflictingConstraint) {
      setPendingConstraint(data)
      setConflictInfo({
        constraint: conflict.conflictingConstraint,
        days: conflict.overlappingDays || []
      })
    } else {
      const newConstraint: Constraint = {
        ...data,
        id: generateUUID()
      }
      setConstraints(prev => [...prev, newConstraint])
      setShowForm(false)
    }
  }

  const handleEditConstraint = (data: Omit<Constraint, 'id'>) => {
    if (editingConstraint) {
      const conflict = detectConflict(data, constraints, editingConstraint.id)

      if (conflict.hasConflict && conflict.conflictingConstraint) {
        setPendingConstraint(data)
        setConflictInfo({
          constraint: conflict.conflictingConstraint,
          days: conflict.overlappingDays || []
        })
      } else {
        setConstraints(prev => prev.map(c =>
          c.id === editingConstraint.id ? { ...data, id: c.id } : c
        ))
        setEditingConstraint(undefined)
        setShowForm(false)
      }
    }
  }

  const handleDeleteConstraint = (id: string) => {
    const constraint = constraints.find(c => c.id === id)
    if (constraint) {
      setDeleteTarget({ id: constraint.id, name: constraint.name })
    }
  }

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      setConstraints(prev => prev.filter(c => c.id !== deleteTarget.id))
      setDeleteTarget(null)
    }
  }

  const handleEdit = (constraint: Constraint) => {
    setEditingConstraint(constraint)
    setShowForm(true)
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingConstraint(undefined)
  }

  const handleConfirmConflict = () => {
    if (pendingConstraint) {
      if (editingConstraint) {
        setConstraints(prev => prev.map(c =>
          c.id === editingConstraint.id ? { ...pendingConstraint, id: c.id } : c
        ))
        setEditingConstraint(undefined)
      } else {
        const newConstraint: Constraint = {
          ...pendingConstraint,
          id: generateUUID()
        }
        setConstraints(prev => [...prev, newConstraint])
      }
      setShowForm(false)
      setPendingConstraint(null)
      setConflictInfo(null)
    }
  }

  const handleCancelConflict = () => {
    setPendingConstraint(null)
    setConflictInfo(null)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(constraints)
      onClose()
    } catch (error) {
      console.error('Erreur sauvegarde contraintes:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = JSON.stringify(constraints) !== JSON.stringify(initialConstraints)

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl max-w-md mx-auto max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-text-dark">
              Indisponibilités
            </h2>
            <p className="text-sm text-text-muted">
              Bloque tes créneaux fixes
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Fermer"
          >
            <XIcon className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* Liste des contraintes */}
          <div className="mb-4">
            {constraints.map(constraint => (
              <ConstraintCard
                key={constraint.id}
                constraint={constraint}
                onEdit={handleEdit}
                onDelete={handleDeleteConstraint}
              />
            ))}

            {constraints.length === 0 && (
              <p className="text-sm text-text-muted text-center py-4">
                Aucune indisponibilité configurée
              </p>
            )}
          </div>

          {/* Formulaire d'ajout/édition */}
          {showForm && (
            <ConstraintForm
              constraint={editingConstraint}
              existingConstraints={constraints}
              onSave={editingConstraint ? handleEditConstraint : handleAddConstraint}
              onCancel={handleCancelForm}
            />
          )}

          {/* Bouton ajouter */}
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-gray-200 rounded-xl text-text-muted hover:border-primary hover:text-primary transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Ajouter une indisponibilité
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-gray-100 shrink-0">
          <ActionButton
            label="Annuler"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          />
          <ActionButton
            label={isSaving ? 'Enregistrement...' : 'Enregistrer'}
            variant="save"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex-1"
          />
        </div>
      </div>

      {/* Modale de conflit */}
      {conflictInfo && pendingConstraint && (
        <ConflictModal
          newConstraintName={pendingConstraint.name}
          conflictingConstraint={conflictInfo.constraint}
          overlappingDays={conflictInfo.days}
          onCancel={handleCancelConflict}
          onConfirm={handleConfirmConflict}
        />
      )}

      {/* Modale de suppression */}
      {deleteTarget && (
        <DeleteConfirmModal
          itemName={deleteTarget.name}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  )
}
