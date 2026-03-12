'use client'

import { AgendaWrapper } from '@/components/agenda/AgendaWrapper'
import { PageTransition } from '@/components/layout/PageTransition'
import BottomNav from '@/components/layout/BottomNav'
import { AddToHomeScreenBanner } from '@/components/layout/AddToHomeScreenBanner'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-mint flex flex-col">
      <AgendaWrapper />
      <PageTransition>
        {children}
      </PageTransition>
      <BottomNav />
      <AddToHomeScreenBanner />
    </div>
  )
}
