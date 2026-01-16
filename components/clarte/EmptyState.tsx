'use client'

interface EmptyStateProps {
  message: string
  className?: string
}

export function EmptyState({ message, className = '' }: EmptyStateProps) {
  return (
    <div className={`py-8 text-center ${className}`}>
      <p className="typo-empty">{message}</p>
    </div>
  )
}
