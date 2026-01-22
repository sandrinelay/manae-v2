'use client'

import { AppHeader } from '@/components/layout/AppHeader'
import { PageTransition } from '@/components/layout/PageTransition'
import BottomNav from '@/components/layout/BottomNav'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-mint flex flex-col">
      <AppHeader />
      <PageTransition>
        {children}
      </PageTransition>
      <BottomNav />
    </div>
  )
}
