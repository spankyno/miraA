import React, { useState, useEffect } from 'react'
import HostView from './components/HostView'
import PeerView from './components/PeerView'

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark'
  })
  
  const [roomId, setRoomId] = useState('')

  // Detectar el parámetro 'room' en la URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomParam = params.get('room')
    if (roomParam) {
      setRoomId(roomParam)
    }
  }, [])

  // Aplicar el tema (dark/light) en el documento
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  // URL del servidor de señalización (ajustable por variable de entorno)
  const signalServerUrl = import.meta.env.VITE_SIGNAL_SERVER_URL || 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'http://localhost:5000' 
      : 'https://miraa-backend.onrender.com') // Reemplazar con URL de producción final si aplica

  return (
    <div className="app-container">
      {/* Header Común */}
      <header className="app-header">
        <a href="/" className="logo" onClick={(e) => {
          if (!roomId) return; // Permitir recarga si ya estamos en la raíz
          e.preventDefault()
          window.location.href = window.location.origin + window.location.pathname
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" strokeWidth="2.5">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
          </svg>
          miraA
        </a>
        
        <button 
          onClick={toggleTheme} 
          className="theme-toggle-btn"
          aria-label="Cambiar tema de color"
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark' ? (
            // Sol
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
            // Luna
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          )}
        </button>
      </header>

      {/* Contenido Principal */}
      <main className="main-content">
        {roomId ? (
          <PeerView roomId={roomId} signalServerUrl={signalServerUrl} />
        ) : (
          <HostView signalServerUrl={signalServerUrl} />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} miraA. Diseñado con ❤️ para compartir tu pantalla al instante.</p>
      </footer>
    </div>
  )
}

export default App
