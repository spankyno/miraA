import React from 'react'
import { useClerk, SignInButton } from '@clerk/clerk-react'
import { formatRemaining } from '../hooks/useFreeUsage'

/**
 * Banner informativo de uso gratuito para usuarios no autenticados.
 * Se muestra en la parte superior del contenido principal.
 */
function UsageBanner({ remainingMs, limitReached }) {
  const minutesLeft = Math.floor(remainingMs / 60000)
  const pct = Math.max(0, Math.min(100, (remainingMs / (30 * 60 * 1000)) * 100))

  if (limitReached) {
    return (
      <div style={{
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid var(--accent-red)',
        borderRadius: '14px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <p style={{ fontWeight: 700, color: 'var(--accent-red)', marginBottom: '0.25rem' }}>
            ⏱️ Límite mensual alcanzado
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Has usado los 30 minutos gratuitos de este mes. Regístrate para continuar sin límites.
          </p>
        </div>
        <SignInButton mode="modal">
          <button style={{
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '0.7rem 1.5rem',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.95rem',
            whiteSpace: 'nowrap'
          }}>
            Registrarse gratis →
          </button>
        </SignInButton>
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--panel-bg)',
      border: '1px solid var(--panel-border)',
      borderRadius: '14px',
      padding: '1rem 1.5rem',
      marginBottom: '1.5rem',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '1rem',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div style={{ flex: 1, minWidth: '200px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '0.4rem',
          fontSize: '0.88rem'
        }}>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
            🆓 Uso gratuito mensual
          </span>
          <span style={{
            color: minutesLeft <= 5 ? 'var(--accent-red)' : 'var(--text-secondary)',
            fontWeight: 600
          }}>
            {formatRemaining(remainingMs)} restantes
          </span>
        </div>
        <div style={{
          height: '6px',
          background: 'var(--input-bg)',
          borderRadius: '100px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: pct > 33
              ? 'linear-gradient(90deg, #6366f1, #a855f7)'
              : 'linear-gradient(90deg, #ef4444, #f97316)',
            borderRadius: '100px',
            transition: 'width 1s linear'
          }} />
        </div>
      </div>

      <SignInButton mode="modal">
        <button style={{
          background: 'transparent',
          color: '#a855f7',
          border: '1px solid #a855f755',
          borderRadius: '10px',
          padding: '0.55rem 1.25rem',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: '0.88rem',
          whiteSpace: 'nowrap',
          transition: 'all 0.2s'
        }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#a855f722'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          Registrarse — uso ilimitado
        </button>
      </SignInButton>
    </div>
  )
}

export default UsageBanner
