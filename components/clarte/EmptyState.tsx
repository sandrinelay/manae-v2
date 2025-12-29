'use client'

interface EmptyStateProps {
  message: string
  className?: string
}

export function EmptyState({ message, className = '' }: EmptyStateProps) {
  return (
    <div className={`py-8 text-center ${className}`}>
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  )
}
