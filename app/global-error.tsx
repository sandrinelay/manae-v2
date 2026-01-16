'use client'

import { useEffect } from 'react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Erreur globale capturée:', error)
  }, [error])

  return (
    <html lang="fr">
      <body>
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#F0FDFA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '320px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              backgroundColor: '#FEF2F2',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <span style={{ fontSize: '40px' }}>⚠️</span>
            </div>

            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1E293B',
              marginBottom: '12px'
            }}>
              Erreur critique
            </h1>

            <p style={{
              color: '#64748B',
              marginBottom: '32px'
            }}>
              L&apos;application a rencontré un problème. Réessaie ou recharge la page.
            </p>

            <button
              onClick={reset}
              style={{
                backgroundColor: '#14B8A6',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Réessayer
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
