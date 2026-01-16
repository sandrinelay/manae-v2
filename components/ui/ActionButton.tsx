'use client'

import React from 'react'
import { ICON_SIZES } from '@/components/ui/icons'

/**
 * ActionButton - Bouton d'action avec texte et/ou icône
 *
 * Variantes sémantiques pour les actions :
 * - save: Action principale (teal/primary)
 * - plan: Caler/Décaler (bleu)
 * - done: Marquer comme fait (vert)
 * - archive: Ranger/archiver (gris)
 * - delete: Supprimer (rouge, bordure)
 * - secondary: Action secondaire (bordure grise)
 *
 * Hauteur fixe de 48px (h-12) pour harmonie avec IconButton size="md"
 */

type ActionVariant = 'save' | 'plan' | 'done' | 'archive' | 'delete' | 'secondary'

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  variant?: ActionVariant
  fullWidth?: boolean
}

// Styles par variante sémantique
const VARIANT_STYLES: Record<ActionVariant, string> = {
  save: 'bg-primary text-white hover:bg-primary/90',
  plan: 'bg-blue-300 text-white hover:bg-blue-400',
  done: 'bg-green-100 text-green-600 hover:bg-green-100',
  archive: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
  delete: 'bg-red-50 text-red-500 hover:bg-red-100',
  secondary: 'border-2 border-border text-text-dark hover:border-primary hover:text-primary'
}

export function ActionButton({
  label,
  icon,
  iconPosition = 'left',
  variant = 'save',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ActionButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`
        h-12
        px-5
        rounded-xl
        font-medium
        flex items-center justify-center gap-2
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANT_STYLES[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {icon && iconPosition === 'left' && (
        <span className={`${ICON_SIZES.sm} flex items-center justify-center`}>
          {icon}
        </span>
      )}
      <span>{label}</span>
      {icon && iconPosition === 'right' && (
        <span className={`${ICON_SIZES.sm} flex items-center justify-center`}>
          {icon}
        </span>
      )}
    </button>
  )
}

// Export des variantes pour référence
export type { ActionVariant }
