'use client'

interface ProfileHeaderProps {
  firstName?: string
  lastName?: string
  email?: string
}

function getInitials(firstName?: string, lastName?: string, email?: string): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }
  if (firstName) {
    return firstName.slice(0, 2).toUpperCase()
  }
  if (email) {
    return email.slice(0, 2).toUpperCase()
  }
  return '??'
}

export function ProfileHeader({ firstName, lastName, email }: ProfileHeaderProps) {
  const initials = getInitials(firstName, lastName, email)
  const displayName = firstName && lastName
    ? `${firstName} ${lastName}`
    : firstName || email?.split('@')[0] || 'Utilisateur'

  return (
    <div className="flex flex-col items-center py-6">
      {/* Avatar avec initiales */}
      <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-3">
        <span className="text-2xl font-bold text-white">
          {initials}
        </span>
      </div>

      {/* Nom */}
      <h1 className="text-xl font-semibold text-text-dark">
        {displayName}
      </h1>

      {/* Email */}
      {email && (
        <p className="text-sm text-text-muted mt-1">
          {email}
        </p>
      )}
    </div>
  )
}
