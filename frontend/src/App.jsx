import React, { useState, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useAuth, UserButton, SignInButton } from '@clerk/clerk-react'
import HostView from './components/HostView'
import PeerView from './components/PeerView'
import AboutPage from './components/AboutPage'
import Footer from './components/Footer'
import UsageBanner from './components/UsageBanner'
import { useFreeUsage } from './hooks/useFreeUsage'

// Componente de la página principal (host/peer)
function MainPage({ signalServerUrl }) {
  const [roomId, setRoomId] = useState('')
  const { isSignedIn } = useAuth()
  const { remainingMs, limitReached, startTracking, stopTracking } = useFreeUsage(isSignedIn)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomParam = params.get('room')
    if (roomParam) setRoomId(roomParam)
  }, [])

  return (
    <main className="main-content">
      {/* Banner de uso gratuito solo para usuarios no autenticados */}
      {!isSignedIn && (
        <UsageBanner remainingMs={remainingMs} limitReached={limitReached} />
      )}

      {limitReached && !isSignedIn ? (
        <div className="glass-panel wide" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏱️</div>
          <h2 style={{ marginBottom: '0.75rem', fontSize: '1.5rem', fontWeight: 700 }}>
            Límite mensual alcanzado
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.7 }}>
            Has consumido los 30 minutos gratuitos de este mes.<br />
            Regístrate gratuitamente para disfrutar de uso ilimitado.
          </p>
          <SignInButton mode="modal">
            <button className="hero-btn">
              Crear cuenta gratis →
            </button>
          </SignInButton>
        </div>
      ) : roomId ? (
        <PeerView
          roomId={roomId}
          signalServerUrl={signalServerUrl}
          onSessionStart={startTracking}
          onSessionStop={stopTracking}
        />
      ) : (
        <HostView
          signalServerUrl={signalServerUrl}
          onSessionStart={startTracking}
          onSessionStop={stopTracking}
        />
      )}
    </main>
  )
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const { isSignedIn } = useAuth()
  const location = useLocation()
  const isAboutPage = location.pathname === '/about'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

  const signalServerUrl = import.meta.env.VITE_SIGNAL_SERVER_URL ||
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : 'https://miraa-backend.onrender.com')

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <a href="/" className="logo" onClick={(e) => {
          if (isAboutPage) return // Navegación normal a /
          e.preventDefault()
          window.location.href = window.location.origin + '/'
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" strokeWidth="2.5">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
          </svg>
          miraA
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Botón de autenticación */}
          {isSignedIn ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: {
                    width: '36px',
                    height: '36px'
                  }
                }
              }}
            />
          ) : (
            <SignInButton mode="modal">
              <button
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.5rem 1.15rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap'
                }}
              >
                Iniciar sesión
              </button>
            </SignInButton>
          )}

          {/* Toggle de tema */}
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            aria-label="Cambiar tema de color"
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? (
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            ) : (
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Rutas */}
      <Routes>
        <Route path="/" element={<MainPage signalServerUrl={signalServerUrl} />} />
        <Route path="/about" element={
          <main className="main-content">
            <div className="glass-panel wide">
              <AboutPage />
            </div>
          </main>
        } />
        <Route path="*" element={
          <main className="main-content" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>404</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Página no encontrada.
            </p>
            <a href="/" style={{
              color: '#a855f7',
              fontWeight: 700,
              textDecoration: 'none'
            }}>
              ← Volver al inicio
            </a>
          </main>
        } />
      </Routes>

      {/* Footer */}
      <Footer />
    </div>
  )
}

export default App
