import React from 'react'
import { SignInButton } from '@clerk/clerk-react'
import { formatRemaining } from '../hooks/useFreeUsage'

/**
 * UsageBanner
 * 
 * compact=true  → versión pequeña para el header (debajo del botón de login)
 * compact=false → versión bloque completa (pantalla de límite alcanzado)
 */
function UsageBanner({ remainingMs, limitReached, compact = false }) {
  const pct = Math.max(0, Math.min(100, (remainingMs / (30 * 60 * 1000)) * 100))
  const minutesLeft = Math.floor(remainingMs / 60000)
  const isLow = minutesLeft <= 5

  // ── Versión compacta para el header ──────────────────────────
  if (compact) {
    if (limitReached) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.35)',
          borderRadius: '10px',
          padding: '0.45rem 0.85rem',
          fontSize: '0.8rem',
          whiteSpace: 'nowrap'
        }}>
          <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>
            ⏱️ Límite mensual alcanzado
          </span>
          <SignInButton mode="modal">
            <button style={{
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              color: '#fff',
              border: 'none',
              borderRadius: '7px',
              padding: '0.3rem 0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.78rem'
            }}>
              Registrarse →
            </button>
          </SignInButton>
        </div>
      )
    }

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        borderRadius: '10px',
        padding: '0.55rem 0.85rem',
        minWidth: '220px'
      }}>
        {/* Etiqueta + tiempo */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.78rem',
          gap: '1rem'
        }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
            🆓 Uso gratuito mensual
          </span>
          <span style={{
            color: isLow ? 'var(--accent-red)' : 'var(--text-secondary)',
            fontWeight: 700
          }}>
            {formatRemaining(remainingMs)} restantes
          </span>
        </div>

        {/* Barra de progreso */}
        <div style={{
          height: '4px',
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

        {/* CTA registro */}
        <SignInButton mode="modal">
          <button style={{
            background: 'transparent',
            color: '#a855f7',
            border: '1px solid #a855f744',
            borderRadius: '7px',
            padding: '0.3rem 0',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.78rem',
            width: '100%',
            transition: 'background 0.2s'
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#a855f714'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Registrarse — uso ilimitado
          </button>
        </SignInButton>
      </div>
    )
  }

  // ── Versión bloque completa (legacy, por si se necesita) ──────
  if (limitReached) {
    return (
      <div style={{
        background: 'rgba(239,68,68,0.1)',
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
            color: '#fff', border: 'none', borderRadius: '10px',
            padding: '0.7rem 1.5rem', fontWeight: 700, cursor: 'pointer',
            fontSize: '0.95rem', whiteSpace: 'nowrap'
          }}>
            Registrarse gratis →
          </button>
        </SignInButton>
      </div>
    )
  }

  return null
}

export default UsageBanner
