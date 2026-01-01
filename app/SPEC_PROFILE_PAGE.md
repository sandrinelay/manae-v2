# SPEC : Page Profil

## 📋 Contexte

### Application
**Manae** — App de productivité pour parents mentalement surchargés. Capture de pensées, triage IA, planification intelligente.

### Feature à implémenter
**Page Profil** (`/profil`) — Permet à l'utilisateur de :
- Modifier ses informations personnelles (nom, prénom) via modale
- Consulter son email (non modifiable)
- Gérer ses préférences de créneaux d'énergie (réutilisation composant onboarding)
- Gérer ses indisponibilités (réutilisation composant onboarding)
- Connecter/déconnecter Google Calendar (sans confirmation)
- Accéder au support et aux documents légaux
- Se déconnecter de l'application (avec confirmation)

---

## ✅ Décisions validées

| Aspect | Décision |
|--------|----------|
| Route | `/profil` |
| Édition nom/prénom | **Modale** (cohérence avec autres éditions) |
| Confirmation déco GCal | **Non** (reconnexion facile) |
| Items "Bientôt" (notifs, abo) | **Masqués complètement** |
| Réutilisation onboarding | **Oui** — Refactor en composants shared |
| Révocation token GCal | **Non** — Suppression locale uniquement |
| Photo profil | **Initiales uniquement** |
| Email | Affiché mais non modifiable (grisé) |
| Déconnexion app | Bouton en bas avec confirmation modale |

---

## 📐 Architecture retenue

```
Page Profil (/profil)
│
├── 👤 ProfileHeader          Avatar initiales + nom complet + email
│
├── 📝 PersonalInfoSection    
│   └── Bouton "Modifier" → Ouvre EditProfileModal
│
├── ⚙️ PreferencesSection     
│   ├── Créneaux d'énergie → EnergyMomentsModal (shared)
│   └── Indisponibilités   → ConstraintsModal (shared)
│
├── 🔗 ConnectionsSection     
│   └── Google Calendar (connect/disconnect direct)
│
├── ➕ MoreSection             
│   ├── 💬 Support → mailto:contact@manae.app
│   └── 📄 Documents légaux → /legal
│
└── 🚪 LogoutSection           
    └── Bouton "Se déconnecter" → LogoutConfirmModal
```

---

## 🗂️ Structure des fichiers

```
À CRÉER :
├── app/profil/page.tsx                      # Page principale
│
├── features/profile/
│   ├── types.ts                             # Types profil
│   ├── hooks/
│   │   └── useProfile.ts                    # Hook données profil
│   └── components/
│       ├── ProfileHeader.tsx                # Avatar + infos
│       ├── PersonalInfoSection.tsx          # Section infos perso
│       ├── PreferencesSection.tsx           # Section préférences
│       ├── ConnectionsSection.tsx           # Section Google Calendar
│       ├── MoreSection.tsx                  # Section liens
│       ├── LogoutSection.tsx                # Section déconnexion
│       ├── EditProfileModal.tsx             # Modal édition nom/prénom
│       └── LogoutConfirmModal.tsx           # Modal confirmation logout
│
├── components/shared/
│   ├── EnergyMomentsModal.tsx               # REFACTOR depuis onboarding
│   └── ConstraintsModal.tsx                 # REFACTOR depuis onboarding

À MODIFIER :
├── services/supabaseService.ts              # Ajouter updateUserName()
├── lib/googleCalendar.ts                    # Ajouter disconnectGoogleCalendar()
└── app/onboarding/step2/page.tsx            # Utiliser EnergyMomentsModal shared
└── app/onboarding/step3/page.tsx            # Utiliser ConstraintsModal shared
```

---

## 📦 Ordre d'implémentation

1. `features/profile/types.ts` — Types de base
2. `features/profile/hooks/useProfile.ts` — Hook données
3. `components/shared/EnergyMomentsModal.tsx` — Refactor depuis step2
4. `components/shared/ConstraintsModal.tsx` — Refactor depuis step3
5. `features/profile/components/ProfileHeader.tsx`
6. `features/profile/components/EditProfileModal.tsx`
7. `features/profile/components/PersonalInfoSection.tsx`
8. `features/profile/components/PreferencesSection.tsx`
9. `features/profile/components/ConnectionsSection.tsx`
10. `features/profile/components/MoreSection.tsx`
11. `features/profile/components/LogoutConfirmModal.tsx`
12. `features/profile/components/LogoutSection.tsx`
13. `app/profil/page.tsx` — Assemblage final
14. Mise à jour onboarding pour utiliser les composants shared

---

## 1️⃣ Types (`features/profile/types.ts`)

```typescript
// ============================================
// TYPES - Page Profil
// ============================================

import type { UserProfile } from '@/services/supabaseService'

/**
 * Props pour le header profil
 */
export interface ProfileHeaderProps {
  firstName: string | null
  lastName: string | null
  email: string
}

/**
 * Props pour la section infos personnelles
 */
export interface PersonalInfoSectionProps {
  firstName: string | null
  lastName: string | null
  email: string
  onEdit: () => void
}

/**
 * Props pour la modal d'édition profil
 */
export interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  firstName: string
  lastName: string
  onSave: (firstName: string, lastName: string) => Promise<void>
}

/**
 * Props pour la section préférences
 */
export interface PreferencesSectionProps {
  energyMoments: string[]
  constraintsCount: number
  onEditEnergy: () => void
  onEditConstraints: () => void
}

/**
 * Props pour la section connexions
 */
export interface ConnectionsSectionProps {
  isConnected: boolean
  connectedEmail?: string
  onConnect: () => void
  onDisconnect: () => void
  isLoading: boolean
}

/**
 * Props pour la modal de confirmation logout
 */
export interface LogoutConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading: boolean
}

/**
 * Configuration des créneaux d'énergie (réutilisée)
 */
export const ENERGY_MOMENTS_CONFIG = {
  early_morning: { 
    label: 'Tôt le matin', 
    emoji: '🌅', 
    timeRange: '6h - 8h' 
  },
  morning: { 
    label: 'Matin', 
    emoji: '☀️', 
    timeRange: '8h - 12h' 
  },
  lunch: { 
    label: 'Midi', 
    emoji: '🍽️', 
    timeRange: '12h - 14h' 
  },
  afternoon: { 
    label: 'Après-midi', 
    emoji: '🌤️', 
    timeRange: '14h - 18h' 
  },
  evening: { 
    label: 'Soirée', 
    emoji: '🌙', 
    timeRange: '18h - 21h' 
  },
  night: { 
    label: 'Nuit', 
    emoji: '🌃', 
    timeRange: '21h - 23h' 
  }
} as const

export type EnergyMoment = keyof typeof ENERGY_MOMENTS_CONFIG
```

---

## 2️⃣ Hook (`features/profile/hooks/useProfile.ts`)

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  getOrCreateUserProfile, 
  updateUserProfile,
  getUserConstraints,
  type UserProfile 
} from '@/services/supabaseService'
import { createClient } from '@/lib/supabase/client'

interface UseProfileReturn {
  // État
  profile: UserProfile | null
  constraintsCount: number
  isLoading: boolean
  error: string | null
  
  // Actions
  updateName: (firstName: string, lastName: string) => Promise<void>
  updateEnergyMoments: (moments: string[]) => Promise<void>
  refreshProfile: () => Promise<void>
  logout: () => Promise<void>
}

export function useProfile(): UseProfileReturn {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [constraintsCount, setConstraintsCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Chargement initial
  const loadProfile = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const [userProfile, constraints] = await Promise.all([
        getOrCreateUserProfile(),
        getUserConstraints()
      ])
      
      setProfile(userProfile)
      setConstraintsCount(constraints.length)
    } catch (err) {
      console.error('Error loading profile:', err)
      setError('Impossible de charger le profil')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  // Mise à jour nom/prénom
  const updateName = useCallback(async (firstName: string, lastName: string) => {
    if (!profile) return
    
    try {
      const updated = await updateUserProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim()
      })
      setProfile(updated)
    } catch (err) {
      console.error('Error updating name:', err)
      throw new Error('Impossible de mettre à jour le profil')
    }
  }, [profile])

  // Mise à jour créneaux d'énergie
  const updateEnergyMoments = useCallback(async (moments: string[]) => {
    if (!profile) return
    
    try {
      const updated = await updateUserProfile({
        energy_moments: moments
      })
      setProfile(updated)
    } catch (err) {
      console.error('Error updating energy moments:', err)
      throw new Error('Impossible de mettre à jour les créneaux')
    }
  }, [profile])

  // Déconnexion
  const logout = useCallback(async () => {
    const supabase = createClient()
    
    // Supprimer les tokens Google Calendar
    localStorage.removeItem('google_tokens')
    
    // Dispatch event pour informer les autres composants
    window.dispatchEvent(new CustomEvent('calendar-connection-changed', {
      detail: { connected: false }
    }))
    
    // Déconnexion Supabase
    await supabase.auth.signOut()
    
    // Redirection
    router.push('/')
  }, [router])

  return {
    profile,
    constraintsCount,
    isLoading,
    error,
    updateName,
    updateEnergyMoments,
    refreshProfile: loadProfile,
    logout
  }
}
```

---

## 3️⃣ Composant shared : EnergyMomentsModal

```typescript
// components/shared/EnergyMomentsModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { ENERGY_MOMENTS_CONFIG, type EnergyMoment } from '@/features/profile/types'

const ALL_MOMENTS: EnergyMoment[] = [
  'early_morning', 'morning', 'lunch', 'afternoon', 'evening', 'night'
]

interface EnergyMomentsModalProps {
  isOpen: boolean
  onClose: () => void
  currentMoments: string[]
  onSave: (moments: string[]) => Promise<void>
}

export function EnergyMomentsModal({ 
  isOpen, 
  onClose, 
  currentMoments, 
  onSave 
}: EnergyMomentsModalProps) {
  const [selected, setSelected] = useState<string[]>(currentMoments)
  const [isSaving, setIsSaving] = useState(false)

  // Reset à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setSelected(currentMoments)
    }
  }, [isOpen, currentMoments])

  const toggleMoment = (moment: string) => {
    setSelected(prev => 
      prev.includes(moment)
        ? prev.filter(m => m !== moment)
        : [...prev, moment]
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(selected)
      onClose()
    } catch (error) {
      console.error('Error saving energy moments:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = JSON.stringify(selected.sort()) !== JSON.stringify([...currentMoments].sort())

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl p-6 z-50 max-w-md mx-auto max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-text-dark mb-2">
          Mes créneaux d'énergie
        </h2>
        <p className="text-sm text-text-muted mb-6">
          Quand es-tu le plus productif ?
        </p>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {ALL_MOMENTS.map((moment) => {
            const config = ENERGY_MOMENTS_CONFIG[moment]
            const isSelected = selected.includes(moment)

            return (
              <button
                key={moment}
                onClick={() => toggleMoment(moment)}
                className={`
                  p-4 rounded-xl border-2 text-left transition-all
                  ${isSelected
                    ? 'border-primary bg-mint'
                    : 'border-border hover:border-primary/50'
                  }
                `}
              >
                <span className="text-2xl mb-2 block">{config.emoji}</span>
                <p className="font-medium text-text-dark">{config.label}</p>
                <p className="text-xs text-text-muted">{config.timeRange}</p>
              </button>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || isSaving}
            className="flex-1"
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </>
  )
}
```

---

## 4️⃣ ProfileHeader

```typescript
// features/profile/components/ProfileHeader.tsx
'use client'

import type { ProfileHeaderProps } from '../types'

function getInitials(firstName: string | null, lastName: string | null): string {
  const first = firstName?.charAt(0).toUpperCase() || ''
  const last = lastName?.charAt(0).toUpperCase() || ''
  return first + last || '?'
}

export function ProfileHeader({ firstName, lastName, email }: ProfileHeaderProps) {
  const initials = getInitials(firstName, lastName)
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Utilisateur'

  return (
    <div className="flex flex-col items-center py-8">
      {/* Avatar */}
      <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-4">
        <span className="text-2xl font-bold text-white">
          {initials}
        </span>
      </div>
      
      {/* Nom */}
      <h1 className="text-xl font-bold text-text-dark mb-1">
        {fullName}
      </h1>
      
      {/* Email */}
      <p className="text-sm text-text-muted">
        {email}
      </p>
    </div>
  )
}
```

---

## 5️⃣ EditProfileModal

```typescript
// features/profile/components/EditProfileModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { EditProfileModalProps } from '../types'

export function EditProfileModal({ 
  isOpen, 
  onClose, 
  firstName: initialFirstName, 
  lastName: initialLastName,
  onSave 
}: EditProfileModalProps) {
  const [firstName, setFirstName] = useState(initialFirstName)
  const [lastName, setLastName] = useState(initialLastName)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setFirstName(initialFirstName)
      setLastName(initialLastName)
      setError(null)
    }
  }, [isOpen, initialFirstName, initialLastName])

  const handleSave = async () => {
    if (!firstName.trim()) {
      setError('Le prénom est requis')
      return
    }

    setIsSaving(true)
    setError(null)
    
    try {
      await onSave(firstName, lastName)
      onClose()
    } catch (err) {
      setError('Erreur lors de la sauvegarde')
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = firstName !== initialFirstName || lastName !== initialLastName

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl p-6 z-50 max-w-md mx-auto">
        <h2 className="text-xl font-bold text-text-dark mb-6">
          Modifier mon profil
        </h2>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Prénom
            </label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ton prénom"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Nom
            </label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Ton nom"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 mb-4">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || isSaving}
            className="flex-1"
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </>
  )
}
```

---

## 6️⃣ PersonalInfoSection

```typescript
// features/profile/components/PersonalInfoSection.tsx
'use client'

import { ChevronRight } from 'lucide-react'
import type { PersonalInfoSectionProps } from '../types'

export function PersonalInfoSection({ 
  firstName, 
  lastName, 
  email, 
  onEdit 
}: PersonalInfoSectionProps) {
  return (
    <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-text-dark">
          Informations personnelles
        </h2>
        <button
          onClick={onEdit}
          className="text-sm text-primary font-medium hover:underline"
        >
          Modifier
        </button>
      </div>

      <div className="px-5 py-4 space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-text-muted">Prénom</span>
          <span className="text-sm text-text-dark font-medium">
            {firstName || '—'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-sm text-text-muted">Nom</span>
          <span className="text-sm text-text-dark font-medium">
            {lastName || '—'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-sm text-text-muted">Email</span>
          <span className="text-sm text-text-muted">
            {email}
          </span>
        </div>
      </div>
    </section>
  )
}
```

---

## 7️⃣ PreferencesSection

```typescript
// features/profile/components/PreferencesSection.tsx
'use client'

import { ChevronRight, Zap, Ban } from 'lucide-react'
import { ENERGY_MOMENTS_CONFIG, type EnergyMoment } from '../types'
import type { PreferencesSectionProps } from '../types'

export function PreferencesSection({ 
  energyMoments, 
  constraintsCount, 
  onEditEnergy, 
  onEditConstraints 
}: PreferencesSectionProps) {
  // Formater l'affichage des créneaux
  const energyDisplay = energyMoments.length > 0
    ? energyMoments
        .map(m => ENERGY_MOMENTS_CONFIG[m as EnergyMoment]?.label)
        .filter(Boolean)
        .join(', ')
    : 'Non définis'

  return (
    <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <h2 className="text-base font-semibold text-text-dark px-5 pt-5 pb-3">
        Mes préférences
      </h2>

      {/* Créneaux d'énergie */}
      <button
        onClick={onEditEnergy}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors border-t border-border"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Zap className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-text-dark">
              Créneaux d'énergie
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              {energyDisplay}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-text-muted" />
      </button>

      {/* Indisponibilités */}
      <button
        onClick={onEditConstraints}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors border-t border-border"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <Ban className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-text-dark">
              Indisponibilités
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              {constraintsCount} contrainte{constraintsCount !== 1 ? 's' : ''} définie{constraintsCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-text-muted" />
      </button>
    </section>
  )
}
```

---

## 8️⃣ ConnectionsSection

```typescript
// features/profile/components/ConnectionsSection.tsx
'use client'

import { Calendar, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { ConnectionsSectionProps } from '../types'

export function ConnectionsSection({ 
  isConnected, 
  connectedEmail,
  onConnect, 
  onDisconnect,
  isLoading 
}: ConnectionsSectionProps) {
  return (
    <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <h2 className="text-base font-semibold text-text-dark px-5 pt-5 pb-3">
        Connexions
      </h2>

      <div className="px-5 py-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-dark">
                Google Calendar
              </p>
              {isConnected ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-text-muted">
                    Connecté{connectedEmail ? ` · ${connectedEmail}` : ''}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                  <span className="text-xs text-text-muted">Non connecté</span>
                </div>
              )}
            </div>
          </div>

          {isLoading ? (
            <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
          ) : isConnected ? (
            <button
              onClick={onDisconnect}
              className="text-sm text-red-500 font-medium hover:underline"
            >
              Déconnecter
            </button>
          ) : (
            <Button 
              onClick={onConnect}
              size="sm"
            >
              Connecter
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
```

---

## 9️⃣ MoreSection

```typescript
// features/profile/components/MoreSection.tsx
'use client'

import Link from 'next/link'
import { ChevronRight, MessageCircle, FileText } from 'lucide-react'

export function MoreSection() {
  return (
    <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <h2 className="text-base font-semibold text-text-dark px-5 pt-5 pb-3">
        Plus
      </h2>

      {/* Support */}
      <a
        href="mailto:contact@manae.app"
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors border-t border-border"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-text-dark">
              Aide & Support
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              contact@manae.app
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-text-muted" />
      </a>

      {/* Documents légaux */}
      <Link
        href="/legal"
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors border-t border-border"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-gray-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-text-dark">
              Documents légaux
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              CGU, Confidentialité, Mentions légales
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-text-muted" />
      </Link>
    </section>
  )
}
```

---

## 🔟 LogoutConfirmModal

```typescript
// features/profile/components/LogoutConfirmModal.tsx
'use client'

import { Button } from '@/components/ui/Button'
import type { LogoutConfirmModalProps } from '../types'

export function LogoutConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  isLoading 
}: LogoutConfirmModalProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl p-6 z-50 max-w-sm mx-auto">
        <h2 className="text-xl font-bold text-text-dark mb-2">
          Se déconnecter ?
        </h2>
        <p className="text-sm text-text-muted mb-6">
          Tu devras te reconnecter pour accéder à tes données.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <Button 
            variant="secondary" 
            onClick={onClose} 
            className="flex-1"
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button 
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 bg-red-500 hover:bg-red-600"
          >
            {isLoading ? 'Déconnexion...' : 'Se déconnecter'}
          </Button>
        </div>
      </div>
    </>
  )
}
```

---

## 1️⃣1️⃣ LogoutSection

```typescript
// features/profile/components/LogoutSection.tsx
'use client'

import { LogOut } from 'lucide-react'

interface LogoutSectionProps {
  onLogout: () => void
}

export function LogoutSection({ onLogout }: LogoutSectionProps) {
  return (
    <section className="mt-6 mb-8">
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-4 text-red-500 font-medium hover:bg-red-50 rounded-2xl transition-colors"
      >
        <LogOut className="w-5 h-5" />
        <span>Se déconnecter</span>
      </button>
    </section>
  )
}
```

---

## 1️⃣2️⃣ Page Profil (`app/profil/page.tsx`)

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Components
import { ProfileHeader } from '@/features/profile/components/ProfileHeader'
import { PersonalInfoSection } from '@/features/profile/components/PersonalInfoSection'
import { PreferencesSection } from '@/features/profile/components/PreferencesSection'
import { ConnectionsSection } from '@/features/profile/components/ConnectionsSection'
import { MoreSection } from '@/features/profile/components/MoreSection'
import { LogoutSection } from '@/features/profile/components/LogoutSection'
import { EditProfileModal } from '@/features/profile/components/EditProfileModal'
import { LogoutConfirmModal } from '@/features/profile/components/LogoutConfirmModal'
import { EnergyMomentsModal } from '@/components/shared/EnergyMomentsModal'
import { BottomNav } from '@/components/layout/BottomNav'

// Hooks
import { useProfile } from '@/features/profile/hooks/useProfile'
import { useGoogleCalendarStatus } from '@/hooks/useGoogleCalendarStatus'

// Utils
import { openGoogleAuthPopup, exchangeCodeForToken } from '@/lib/googleCalendar'

export default function ProfilPage() {
  const router = useRouter()
  const { 
    profile, 
    constraintsCount, 
    isLoading, 
    error,
    updateName,
    updateEnergyMoments,
    logout 
  } = useProfile()
  
  const { isConnected, checkConnection } = useGoogleCalendarStatus()
  
  // États des modales
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showEnergyModal, setShowEnergyModal] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  
  // États de chargement
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Connexion Google Calendar
  const handleConnectCalendar = async () => {
    setIsConnectingCalendar(true)
    try {
      const code = await openGoogleAuthPopup()
      if (code) {
        await exchangeCodeForToken(code)
        checkConnection()
      }
    } catch (error) {
      console.error('Error connecting calendar:', error)
    } finally {
      setIsConnectingCalendar(false)
    }
  }

  // Déconnexion Google Calendar (sans confirmation)
  const handleDisconnectCalendar = () => {
    localStorage.removeItem('google_tokens')
    window.dispatchEvent(new CustomEvent('calendar-connection-changed', {
      detail: { connected: false }
    }))
    checkConnection()
  }

  // Déconnexion de l'app
  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
    } catch (error) {
      console.error('Error logging out:', error)
      setIsLoggingOut(false)
    }
  }

  // Navigation vers la page des contraintes
  const handleEditConstraints = () => {
    router.push('/onboarding/step3?from=profile')
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-mint flex items-center justify-center">
        <div className="animate-pulse text-text-muted">Chargement...</div>
      </div>
    )
  }

  // Error state
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-mint flex items-center justify-center">
        <div className="text-red-500">{error || 'Erreur de chargement'}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mint pb-24">
      <div className="max-w-lg mx-auto px-4">
        {/* Header avec avatar */}
        <ProfileHeader
          firstName={profile.first_name}
          lastName={profile.last_name}
          email={profile.email}
        />

        {/* Sections */}
        <div className="space-y-4">
          <PersonalInfoSection
            firstName={profile.first_name}
            lastName={profile.last_name}
            email={profile.email}
            onEdit={() => setShowEditProfile(true)}
          />

          <PreferencesSection
            energyMoments={profile.energy_moments || []}
            constraintsCount={constraintsCount}
            onEditEnergy={() => setShowEnergyModal(true)}
            onEditConstraints={handleEditConstraints}
          />

          <ConnectionsSection
            isConnected={isConnected}
            onConnect={handleConnectCalendar}
            onDisconnect={handleDisconnectCalendar}
            isLoading={isConnectingCalendar}
          />

          <MoreSection />

          <LogoutSection onLogout={() => setShowLogoutConfirm(true)} />
        </div>
      </div>

      {/* Navigation */}
      <BottomNav />

      {/* Modales */}
      <EditProfileModal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        firstName={profile.first_name || ''}
        lastName={profile.last_name || ''}
        onSave={updateName}
      />

      <EnergyMomentsModal
        isOpen={showEnergyModal}
        onClose={() => setShowEnergyModal(false)}
        currentMoments={profile.energy_moments || []}
        onSave={updateEnergyMoments}
      />

      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        isLoading={isLoggingOut}
      />
    </div>
  )
}
```

---

## 📱 Aperçu visuel final

```
┌─────────────────────────────────────┐
│                                     │
│          [Avatar: SL]              │
│        Sand Lastname               │
│       sand@example.com             │
│                                     │
├─────────────────────────────────────┤
│ INFORMATIONS PERSONNELLES  Modifier│
│ Prénom: Sand                       │
│ Nom: Lastname                      │
│ Email: sand@example.com (grisé)    │
├─────────────────────────────────────┤
│ MES PRÉFÉRENCES                    │
│ ⚡ Créneaux d'énergie          >   │
│    Matin, Après-midi               │
│ 🚫 Indisponibilités            >   │
│    3 contraintes définies          │
├─────────────────────────────────────┤
│ CONNEXIONS                         │
│ 📅 Google Calendar    [Déconnecter]│
│    ● Connecté                      │
├─────────────────────────────────────┤
│ PLUS                               │
│ 💬 Aide & Support              >   │
│ 📄 Documents légaux            >   │
├─────────────────────────────────────┤
│                                     │
│   🚪 Se déconnecter (rouge)        │
│                                     │
└─────────────────────────────────────┘
│ [Capturer] [Clarté] [●Profil]      │
└─────────────────────────────────────┘
```

---

## ⚠️ Points d'attention

1. **Hook `useGoogleCalendarStatus`** : Vérifier qu'il existe déjà dans `/hooks/`. Sinon, le créer.

2. **Refactor step2/step3** : Après création des composants shared, mettre à jour les pages onboarding pour les utiliser.

3. **Navigation contraintes** : La redirection vers `/onboarding/step3?from=profile` nécessite de gérer le paramètre `from` pour le bouton retour.

4. **Tokens Google** : Les tokens sont stockés dans `localStorage` sous la clé `google_tokens`.

---

## 🧪 Tests à effectuer

1. **Affichage profil** : Vérifier que les données s'affichent correctement
2. **Édition nom/prénom** : Modale s'ouvre, sauvegarde fonctionne
3. **Créneaux d'énergie** : Modale s'ouvre, sélection/désélection, sauvegarde
4. **Indisponibilités** : Navigation vers step3 avec retour fonctionnel
5. **Google Calendar** : Connexion/déconnexion sans erreur
6. **Déconnexion** : Confirmation puis redirection vers /

---

## 🔮 Évolutions futures (hors scope beta)

| Feature | Priorité |
|---------|----------|
| Notifications push | Post-beta |
| Gestion abonnement | Post-beta (Stripe) |
| Export RGPD | Post-beta |
| Suppression compte | Post-beta |
| Photo de profil | Basse |
| Thème sombre | Basse |
