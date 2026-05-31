import React from 'react'

function Footer() {
  return (
    <footer className="app-footer" style={{
      borderTop: '1px solid var(--panel-border)',
      marginTop: 'auto',
      padding: '2rem 0 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem'
    }}>
      {/* Navigation links */}
      <nav style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem 1.5rem',
        justifyContent: 'center',
        fontSize: '0.9rem'
      }}>
        <a
          href="/about"
          style={{
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontWeight: 500,
            transition: 'color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#a855f7'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          Acerca de
        </a>

        <a
          href="https://aitorsanchez.pages.dev/contacto/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontWeight: 500,
            transition: 'color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#a855f7'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          Contacto
        </a>

        <a
          href="https://aitorsanchez.pages.dev/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontWeight: 500,
            transition: 'color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#a855f7'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          Blog
        </a>

        <a
          href="https://aitorhub.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontWeight: 500,
            transition: 'color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#a855f7'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          Más apps
        </a>
      </nav>

      {/* Copyright */}
      <p style={{
        color: 'var(--text-muted)',
        fontSize: '0.85rem',
        textAlign: 'center',
        lineHeight: 1.6
      }}>
        Aitor Sánchez Gutiérrez © 2026 — Reservados todos los derechos
      </p>
    </footer>
  )
}

export default Footer
