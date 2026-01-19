'use client'

import { type ReactNode } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { AIQuotaProvider } from '@/contexts/AIQuotaContext'
import { ClarteDataProvider } from '@/contexts/ClarteDataContext'
import { ProfileDataProvider } from '@/contexts/ProfileDataContext'

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <AIQuotaProvider>
        <ClarteDataProvider>
          <ProfileDataProvider>
            {children}
          </ProfileDataProvider>
        </ClarteDataProvider>
      </AIQuotaProvider>
    </AuthProvider>
  )
}
