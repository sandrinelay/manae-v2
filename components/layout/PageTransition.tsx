'use client'

import { usePathname } from 'next/navigation'
import { useLayoutEffect, useRef, type ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const containerRef = useRef<HTMLDivElement>(null)

  // useLayoutEffect pour éviter le flash visuel
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Reset et relance l'animation
    el.classList.remove('animate-fade-in')
    // Force reflow pour restart l'animation
    void el.offsetWidth
    el.classList.add('animate-fade-in')
  }, [pathname])

  return (
    <div ref={containerRef} className="flex-1 flex flex-col">
      {children}
    </div>
  )
}
