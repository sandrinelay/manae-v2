'use client'

import { useState } from 'react'
import { ChevronRightIcon, UserIcon } from '@/components/ui/icons'
import { EditNameModal } from './EditNameModal'

interface PersonalInfoSectionProps {
  firstName?: string
  lastName?: string
  email?: string
  onSave: (firstName: string, lastName: string) => Promise<void>
  // Props pour contrôle externe des modales (évite problème PullToRefresh + position:fixed)
  externalModalControl?: boolean
  onShowEditModal?: () => void
}

export function PersonalInfoSection({
  firstName,
  lastName,
  email,
  onSave,
  externalModalControl = false,
  onShowEditModal
}: PersonalInfoSectionProps) {
  const [showEditModal, setShowEditModal] = useState(false)

  const displayName = firstName && lastName
    ? `${firstName} ${lastName}`
    : firstName || 'Non renseigné'

  return (
    <>
      <section className="bg-white rounded-2xl overflow-hidden">
        <h2 className="px-4 pt-4 pb-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
          Informations personnelles
        </h2>

        {/* Nom / Prénom - Modifiable */}
        <button
          onClick={() => {
            if (externalModalControl && onShowEditModal) {
              onShowEditModal()
            } else {
              setShowEditModal(true)
            }
          }}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <UserIcon className="w-5 h-5 text-text-muted" />
            <div className="text-left">
              <p className="text-sm text-text-muted">Nom</p>
              <p className="text-text-dark">{displayName}</p>
            </div>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-text-muted" />
        </button>

        {/* Email - Non modifiable */}
        <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100">
          <div className="w-5 h-5" /> {/* Spacer pour alignement */}
          <div>
            <p className="text-sm text-text-muted">Email</p>
            <p className="text-gray-400">{email || 'Non renseigné'}</p>
          </div>
        </div>
      </section>

      {!externalModalControl && showEditModal && (
        <EditNameModal
          firstName={firstName}
          lastName={lastName}
          onClose={() => setShowEditModal(false)}
          onSave={async (newFirstName, newLastName) => {
            await onSave(newFirstName, newLastName)
            setShowEditModal(false)
          }}
        />
      )}
    </>
  )
}
