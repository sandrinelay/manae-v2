'use client'

import { useState, useCallback, useRef } from 'react'

type AnimationType = 'slide-out-right' | 'slide-out-left' | 'none'

interface UseItemAnimationOptions {
  onAnimationEnd?: () => void
  duration?: number
}

interface UseItemAnimationReturn {
  isAnimating: boolean
  animationClass: string
  triggerExit: (type?: AnimationType) => Promise<void>
}

/**
 * Hook pour gérer les animations de sortie des items
 * Utilisé pour animer la disparition d'un item avant de le supprimer/archiver
 */
export function useItemAnimation(options: UseItemAnimationOptions = {}): UseItemAnimationReturn {
  const { onAnimationEnd, duration = 250 } = options
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationType, setAnimationType] = useState<AnimationType>('none')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const triggerExit = useCallback(async (type: AnimationType = 'slide-out-right') => {
    return new Promise<void>((resolve) => {
      setIsAnimating(true)
      setAnimationType(type)

      // Nettoyer le timeout précédent si existant
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        setIsAnimating(false)
        setAnimationType('none')
        onAnimationEnd?.()
        resolve()
      }, duration)
    })
  }, [duration, onAnimationEnd])

  const animationClass = isAnimating && animationType !== 'none'
    ? `animate-${animationType}`
    : ''

  return {
    isAnimating,
    animationClass,
    triggerExit
  }
}

/**
 * Génère la classe de stagger pour l'animation d'entrée
 */
export function getStaggerClass(index: number, maxStagger = 5): string {
  const staggerIndex = Math.min(index + 1, maxStagger)
  return `stagger-${staggerIndex}`
}
