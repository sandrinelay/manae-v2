'use client'

import { useState, useEffect } from 'react'
import { XIcon, SmartphoneIcon } from '@/components/ui/icons'

const STORAGE_KEY = 'manae_pwa_banner_dismissed'

/**
 * Bannière invitant à ajouter l'app sur l'écran d'accueil
 * - S'affiche uniquement sur mobile
 * - Ne s'affiche pas si déjà en mode standalone (installé)
 * - Ne s'affiche qu'une seule fois
 */
export function AddToHomeScreenBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Vérifier si déjà dismissé
    const isDismissed = localStorage.getItem(STORAGE_KEY)
    if (isDismissed) return

    // Vérifier si déjà en mode standalone (app installée)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    if (isStandalone) return

    // Vérifier si c'est un mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (!isMobile) return

    // Détecter iOS pour adapter le message
    const isIOSDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    setIsIOS(isIOSDevice)

    // Afficher après un court délai pour ne pas interrompre le chargement
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-20 inset-x-4 z-50 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600"
          aria-label="Fermer"
        >
          <XIcon className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <SmartphoneIcon className="w-5 h-5 text-primary" />
          </div>

          <div>
            <h3 className="font-semibold text-text-dark text-sm">
              Ajoute Manae à ton écran d'accueil
            </h3>
            <p className="text-text-muted text-xs mt-1">
              {isIOS ? (
                <>Appuie sur <span className="font-medium">Partager</span> puis <span className="font-medium">"Sur l'écran d'accueil"</span></>
              ) : (
                <>Appuie sur <span className="font-medium">⋮</span> puis <span className="font-medium">"Ajouter à l'écran d'accueil"</span></>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
