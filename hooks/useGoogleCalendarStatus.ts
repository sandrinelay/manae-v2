'use client'

import { useState, useEffect } from 'react'

export function useGoogleCalendarStatus() {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Vérifier dans localStorage si les tokens Google existent
    const tokens = localStorage.getItem('google_tokens')
    setIsConnected(!!tokens)
    setIsLoading(false)

    // Écouter les changements de connexion
    const handleConnectionChange = (event: CustomEvent<{ connected: boolean }>) => {
      setIsConnected(event.detail.connected)
    }

    window.addEventListener('calendar-connection-changed', handleConnectionChange as EventListener)

    return () => {
      window.removeEventListener('calendar-connection-changed', handleConnectionChange as EventListener)
    }
  }, [])

  return { isConnected, isLoading }
}
