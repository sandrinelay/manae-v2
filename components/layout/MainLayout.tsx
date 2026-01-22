'use client'

import { type ReactNode } from 'react'
import BottomNav from './BottomNav'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  )
}
