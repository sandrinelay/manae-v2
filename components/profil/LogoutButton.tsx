'use client'

import { useState } from 'react'
import { LogOutIcon } from '@/components/ui/icons'
import { ActionButton } from '@/components/ui/ActionButton'

interface LogoutButtonProps {
  onLogout: () => Promise<void>
}

export function LogoutButton({ onLogout }: LogoutButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await onLogout()
    } catch (error) {
      console.error('Erreur déconnexion:', error)
      setIsLoggingOut(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full flex items-center justify-center gap-2 py-4 text-red-500 hover:bg-red-50 rounded-2xl transition-colors"
      >
        <LogOutIcon className="w-5 h-5" />
        <span className="font-medium">Se déconnecter</span>
      </button>

      {/* Modal de confirmation */}
      {showConfirm && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowConfirm(false)}
          />

          {/* Modal */}
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl max-w-sm mx-auto">
            {/* Content */}
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-text-dark">
                Se déconnecter ?
              </h3>
              <p className="text-sm text-text-muted">
                Tu pourras te reconnecter à tout moment avec ton compte.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-4 border-t border-gray-100">
              <ActionButton
                label="Annuler"
                variant="secondary"
                onClick={() => setShowConfirm(false)}
                className="flex-1"
              />
              <ActionButton
                label={isLoggingOut ? 'Déconnexion...' : 'Confirmer'}
                variant="delete"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1"
              />
            </div>
          </div>
        </>
      )}
    </>
  )
}
