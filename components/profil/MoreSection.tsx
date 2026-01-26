'use client'

import { useState } from 'react'
import {
  ChevronRightIcon,
  HelpCircleIcon,
  FileTextIcon,
  BookOpenIcon,
  DownloadIcon,
  TrashIcon
} from '@/components/ui/icons'
import { ActionButton } from '@/components/ui/ActionButton'

const SITE_URL = 'https://manae.app'

const LEGAL_LINKS = [
  { label: 'CGU', href: `${SITE_URL}/legal/cgu` },
  { label: 'Confidentialité', href: `${SITE_URL}/legal/confidentialite` },
  { label: 'Mentions légales', href: `${SITE_URL}/legal/mentions-legales` },
]

export function MoreSection() {
  const [isExporting, setIsExporting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Export des données
  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/account/export')

      if (!response.ok) {
        throw new Error('Erreur lors de l\'export')
      }

      // Déclencher le téléchargement
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `manae-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Erreur export:', error)
      alert('Erreur lors de l\'export des données')
    } finally {
      setIsExporting(false)
    }
  }

  // Suppression du compte
  const handleDelete = async () => {
    setIsDeleting(true)
    setDeleteError(null)

    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la suppression')
      }

      // Nettoyer le localStorage
      localStorage.clear()

      // Rediriger vers la page de login
      window.location.href = '/login?deleted=true'
    } catch (error) {
      console.error('Erreur suppression:', error)
      setDeleteError(error instanceof Error ? error.message : 'Erreur inconnue')
      setIsDeleting(false)
    }
  }

  return (
    <>
      <section className="bg-white rounded-2xl overflow-hidden">
        <h2 className="px-4 pt-4 pb-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
          Plus
        </h2>

        {/* Guide simple */}
        <a
          href={`${SITE_URL}/guide-simple`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <BookOpenIcon className="w-5 h-5 text-text-muted" />
            <span className="text-text-dark">Guide simple</span>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-text-muted" />
        </a>

        {/* Support */}
        <a
          href="mailto:support@manae.app"
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-t border-gray-100"
        >
          <div className="flex items-center gap-3">
            <HelpCircleIcon className="w-5 h-5 text-text-muted" />
            <span className="text-text-dark">Support</span>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-text-muted" />
        </a>

        {/* Liens légaux */}
        {LEGAL_LINKS.map((link, index) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors ${
              index === 0 ? 'border-t border-gray-100' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <FileTextIcon className="w-5 h-5 text-text-muted" />
              <span className="text-text-dark">{link.label}</span>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-text-muted" />
          </a>
        ))}
      </section>

      {/* Section Données personnelles */}
      <section className="bg-white rounded-2xl overflow-hidden">
        <h2 className="px-4 pt-4 pb-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
          Mes données
        </h2>

        {/* Export des données */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <div className="flex items-center gap-3">
            <DownloadIcon className="w-5 h-5 text-text-muted" />
            <span className="text-text-dark">
              {isExporting ? 'Export en cours...' : 'Exporter mes données'}
            </span>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-text-muted" />
        </button>

        {/* Supprimer mon compte */}
        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-red-50 transition-colors border-t border-gray-100"
        >
          <div className="flex items-center gap-3">
            <TrashIcon className="w-5 h-5 text-red-500" />
            <span className="text-red-500">Supprimer mon compte</span>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-red-300" />
        </button>
      </section>

      {/* Modal de confirmation suppression */}
      {showDeleteModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => !isDeleting && setShowDeleteModal(false)}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl max-w-md mx-auto p-6">
            <h3 className="text-lg font-bold text-text-dark mb-2">
              Supprimer mon compte
            </h3>
            <p className="text-text-muted text-sm mb-4">
              Cette action est irréversible. Toutes tes données seront définitivement supprimées :
            </p>
            <ul className="text-sm text-text-muted mb-6 space-y-1 list-disc list-inside">
              <li>Tes tâches, notes et idées</li>
              <li>Tes listes de courses</li>
              <li>Tes préférences et contraintes</li>
              <li>Ton compte Manae</li>
            </ul>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{deleteError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <ActionButton
                label="Annuler"
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1"
              />
              <ActionButton
                label={isDeleting ? 'Suppression...' : 'Supprimer'}
                variant="delete"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1"
              />
            </div>
          </div>
        </>
      )}
    </>
  )
}
