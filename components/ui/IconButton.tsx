'use client'

import React from 'react'
import { ICON_SIZES } from '@/components/ui/icons'

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  label: string
  variant?: 'default' | 'primary' | 'ghost' | 'success' | 'teal' | 'danger' | 'archive' | 'plan'
  size?: 'sm' | 'md' | 'lg'
}

// Tailles de bouton standardisées
const BUTTON_SIZES = {
  sm: 'w-10 h-10', // 40px bouton avec icône 20px
  md: 'w-12 h-12', // 48px bouton avec icône 24px (standard)
  lg: 'w-14 h-14'  // 56px bouton avec icône 28px
}

/**
 * Bouton icône standardisé
 * Utilise les constantes centralisées de @/components/ui/icons
 * - sm: 40x40px avec icône 20x20px
 * - md: 48x48px avec icône 24x24px (défaut)
 * - lg: 56x56px avec icône 28x28px
 */
export function IconButton({
  icon,
  label,
  variant = 'default',
  size = 'md',
  className = '',
  disabled,
  ...props
}: IconButtonProps) {
  const sizeStyles = BUTTON_SIZES[size]
  const iconSizeStyles = size === 'sm' ? ICON_SIZES.sm : size === 'lg' ? 'w-7 h-7' : ICON_SIZES.md

  const variantStyles = {
    default: 'bg-white border border-gray-200 text-text-dark hover:bg-gray-50 hover:border-gray-300',
    primary: 'bg-primary text-white hover:bg-primary-dark',
    ghost: 'bg-transparent text-text-muted hover:bg-gray-100 hover:text-text-dark',
    success: 'bg-green-50 text-green-500 hover:bg-green-100',
    teal: 'bg-teal-50 text-teal-500 hover:bg-teal-100',
    danger: 'bg-red-50 text-red-500 hover:bg-red-100',
    archive: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
    plan: 'bg-blue-50 text-blue-600 hover:bg-blue-100'
  }

  return (
    <button
      aria-label={label}
      disabled={disabled}
      className={`
        ${sizeStyles}
        rounded-xl
        flex items-center justify-center
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    >
      <span className={`${iconSizeStyles} flex items-center justify-center`}>
        {icon}
      </span>
    </button>
  )
}
