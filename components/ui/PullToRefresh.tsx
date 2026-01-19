'use client'

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'

interface PullToRefreshProps {
  children: ReactNode
  onRefresh: () => Promise<void>
  threshold?: number
  className?: string
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 70,
  className = ''
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const isPulling = useRef(false)
  const touchStartedInContainer = useRef(false)

  const isAtTop = useCallback(() => {
    const tolerance = 5
    const scrollTop = Math.max(
      window.scrollY || 0,
      window.pageYOffset || 0,
      document.documentElement.scrollTop || 0,
      document.body.scrollTop || 0
    )
    return scrollTop <= tolerance
  }, [])

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isRefreshing) return

    const container = containerRef.current
    if (!container) return

    const target = e.target as Node
    if (!container.contains(target)) {
      touchStartedInContainer.current = false
      return
    }

    touchStartedInContainer.current = true
    startY.current = e.touches[0].clientY

    if (isAtTop()) {
      isPulling.current = true
    }
  }, [isAtTop, isRefreshing])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartedInContainer.current || isRefreshing) return

    const currentY = e.touches[0].clientY
    const diff = currentY - startY.current

    if (diff > 0 && isAtTop()) {
      if (!isPulling.current) {
        isPulling.current = true
        startY.current = currentY
        return
      }

      e.preventDefault()

      const resistance = 0.4
      const distance = Math.min(diff * resistance, threshold * 1.5)
      setPullDistance(distance)
    } else if (diff <= 0 && isPulling.current) {
      isPulling.current = false
      setPullDistance(0)
    }
  }, [isRefreshing, threshold, isAtTop])

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return
    isPulling.current = false

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(threshold * 0.5)

      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh])

  useEffect(() => {
    const options: AddEventListenerOptions = { passive: false }
    const passiveOptions: AddEventListenerOptions = { passive: true }

    document.addEventListener('touchstart', handleTouchStart, passiveOptions)
    document.addEventListener('touchmove', handleTouchMove, options)
    document.addEventListener('touchend', handleTouchEnd, passiveOptions)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  const isTriggered = pullDistance >= threshold

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        touchAction: pullDistance > 0 ? 'none' : 'pan-y',
        overscrollBehavior: 'none'
      }}
    >
      {/* Indicateur de pull */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center z-30 pointer-events-none"
        style={{
          top: 0,
          height: Math.max(pullDistance, 0),
          opacity: pullDistance > 10 ? 1 : 0,
          transition: isRefreshing ? 'none' : 'opacity 0.2s'
        }}
      >
        <div
          className={`
            w-8 h-8 rounded-full border-[3px]
            ${isTriggered || isRefreshing ? 'border-primary' : 'border-gray-300'}
            ${isRefreshing ? 'border-t-transparent' : ''}
          `}
          style={{
            transform: isRefreshing ? 'none' : `rotate(${pullDistance * 3}deg)`,
            animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
            borderTopColor: isRefreshing ? 'transparent' : undefined
          }}
        />
      </div>

      {/* Contenu */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling.current ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  )
}
