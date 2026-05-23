import React, { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

function PeerView({ roomId, signalServerUrl }) {
  const [status, setStatus] = useState('connecting') // 'connecting', 'live', 'stopped', 'error', 'reconnecting'
  const [errorMsg, setErrorMsg] = useState('')
  const [isMuted, setIsMuted] = useState(true)
  const [volume, setVolume] = useState(1) // 0 a 1
  const [remoteStream, setRemoteStream] = useState(null)

  const socketRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const peerConnectionRef = useRef(null)

  // Servidores STUN recomendados
  const iceServersConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  }

  useEffect(() => {
    connectToRoom()

    return () => {
      cleanup()
    }
  }, [roomId])

  // Asignar el stream remoto de forma segura cuando el elemento se monte y esté listo
  useEffect(() => {
    if (status === 'live' && remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream
      // Forzar la reproducción automática de forma segura
      remoteVideoRef.current.play().catch(err => {
        console.warn("[Autoplay] La reproducción automática fue bloqueada o falló:", err)
      })
    }
  }, [status, remoteStream])

  const connectToRoom = () => {
    setStatus('connecting')
    setErrorMsg('')
    setRemoteStream(null)

    const socket = io(signalServerUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    })
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('Conectado al servidor de señalización, uniéndose a sala:', roomId)
      setErrorMsg('') // Limpiar mensajes de error previos al conectar con éxito
      setStatus(prevStatus => prevStatus === 'reconnecting' ? 'connecting' : prevStatus)
      
      socket.emit('join-room', { roomId }, (response) => {
        if (!response.success) {
          setStatus('error')
          setErrorMsg(response.error || 'No se pudo unir a la sala.')
          cleanup()
        }
      })
    })

    socket.on('connect_error', () => {
      setStatus('reconnecting')
      setErrorMsg('Perdimos la conexión con el servidor. Reconectando...')
    })

    // Recibir Oferta WebRTC del Host
    socket.on('webrtc-offer', async ({ hostId, offer }) => {
      console.log('Oferta SDP recibida del Host. Creando PeerConnection...')
      
      try {
        // Limpiar conexión previa si existiera
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close()
        }

        const pc = new RTCPeerConnection(iceServersConfig)
        peerConnectionRef.current = pc

        // Al recibir la pista de video/audio del Host
        pc.ontrack = (event) => {
          console.log('¡Pistas multimedia recibidas con éxito!')
          setRemoteStream(event.streams[0])
          setStatus('live')
        }

        // Intercambio de ICE Candidates hacia el Host
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('webrtc-ice-candidate', {
              targetId: hostId,
              candidate: event.candidate
            })
          }
        }

        // Monitorear cambios de estado en la conexión
        pc.onconnectionstatechange = () => {
          console.log('Estado de conexión WebRTC:', pc.connectionState)
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            setStatus('reconnecting')
          } else if (pc.connectionState === 'connected') {
            setStatus('live')
          }
        }

        // Configurar oferta remota y crear respuesta local
        await pc.setRemoteDescription(new RTCSessionDescription(offer))

        // Procesar candidatos ICE encolados
        if (socketRef.current.iceQueue) {
          console.log(`[WebRTC] Procesando ${socketRef.current.iceQueue.length} candidatos ICE encolados`)
          for (const cand of socketRef.current.iceQueue) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand))
            } catch (err) {
              console.error('Error al procesar ICE Candidate en cola:', err)
            }
          }
          socketRef.current.iceQueue = []
        }

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        // Enviar respuesta al Host
        socket.emit('webrtc-answer', { hostId, answer })

      } catch (err) {
        console.error('Error al manejar la oferta WebRTC:', err)
        setStatus('error')
        setErrorMsg('Error al negociar la conexión de video con el Host.')
      }
    })

    // Recibir Candidatos ICE del Host
    socket.on('webrtc-ice-candidate', async ({ senderId, candidate }) => {
      const pc = peerConnectionRef.current
      if (pc) {
        if (pc.remoteDescription && candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
          } catch (err) {
            console.error('Error al agregar ICE Candidate:', err)
          }
        } else if (candidate) {
          // Encolar candidato si el peer connection aún no tiene la descripción remota
          if (!socketRef.current.iceQueue) {
            socketRef.current.iceQueue = []
          }
          socketRef.current.iceQueue.push(candidate)
        }
      } else if (candidate) {
        // Encolar candidato si el socket ya está conectado pero el peer connection aún no se ha creado
        if (!socketRef.current.iceQueue) {
          socketRef.current.iceQueue = []
        }
        socketRef.current.iceQueue.push(candidate)
      }
    })

    // Recibir señal de parada del Host
    socket.on('host-stopped', () => {
      console.log('El Host detuvo la transmisión.')
      setStatus('stopped')
      cleanup()
    })
  }

  // Limpiar recursos
  const cleanup = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
    setRemoteStream(null)
  }

  const handleRetry = () => {
    cleanup()
    connectToRoom()
  }

  // Controlar volumen y silencio del video local
  const toggleMute = () => {
    if (remoteVideoRef.current) {
      const newState = !isMuted
      remoteVideoRef.current.muted = newState
      setIsMuted(newState)
    }
  }

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    if (remoteVideoRef.current) {
      remoteVideoRef.current.volume = val
      remoteVideoRef.current.muted = val === 0
      setIsMuted(val === 0)
    }
  }

  return (
    <div className="glass-panel wide">
      {status === 'connecting' && (
        <div style={{ padding: '2rem 0', animation: 'fadeIn 0.5s ease-out' }}>
          <span className="status-badge connecting" style={{ marginBottom: '1.5rem' }}>
            <span className="dot"></span>
            Conectando...
          </span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            Uniéndose a la sala de transmisión
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Esperando señal del presentador. La transmisión comenzará pronto.
          </p>
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
            {/* Spinner animado */}
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid var(--panel-border)',
              borderTopColor: '#a855f7',
              borderRadius: '50%',
              animation: 'pulseIndigo 1s linear infinite'
            }} />
          </div>
        </div>
      )}

      {status === 'reconnecting' && (
        <div style={{ padding: '2rem 0', animation: 'fadeIn 0.5s ease-out' }}>
          <span className="status-badge connecting" style={{ marginBottom: '1.5rem', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <span className="dot" style={{ backgroundColor: 'var(--accent-red)', animation: 'pulseGreen 1.5s infinite' }}></span>
            Reconectando...
          </span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            Conexión interrumpida
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            {errorMsg || 'Intentando restablecer la conexión con el servidor o el host.'}
          </p>
          <button onClick={handleRetry} className="btn btn-primary">
            Reintentar Ahora
          </button>
        </div>
      )}

      {status === 'stopped' && (
        <div style={{ padding: '2rem 0', animation: 'fadeIn 0.5s ease-out' }}>
          <div style={{ 
            fontSize: '3rem', 
            marginBottom: '1rem',
            animation: 'fadeIn 1s ease-out'
          }}>
            👋
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.5rem' }}>
            Transmisión Finalizada
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '2rem' }}>
            El host ha detenido la compartición de pantalla.
          </p>
          <a href="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Ir al Inicio
          </a>
        </div>
      )}

      {status === 'error' && (
        <div style={{ padding: '2rem 0', animation: 'fadeIn 0.5s ease-out' }}>
          <div style={{ 
            fontSize: '3rem', 
            marginBottom: '1rem',
            color: 'var(--accent-red)'
          }}>
            ⚠️
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.5rem' }}>
            No se pudo conectar
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '2rem' }}>
            {errorMsg || 'Ocurrió un problema al intentar conectarse a la transmisión.'}
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <a href="/" className="btn" style={{ textDecoration: 'none' }}>
              Ir al Inicio
            </a>
            <button onClick={handleRetry} className="btn btn-primary">
              Reintentar Conexión
            </button>
          </div>
        </div>
      )}

      {status === 'live' && (
        <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
          {/* Header de Transmisión */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '1rem',
            borderBottom: '1px solid var(--panel-border)',
            paddingBottom: '0.75rem'
          }}>
            <span className="status-badge live">
              <span className="dot"></span>
              En Vivo
            </span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
              Sala: {roomId}
            </span>
          </div>

          {/* Reproductor de Video */}
          <div className="video-wrapper">
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              muted={isMuted}
              className="video-element"
            />
            
            {/* Controles del Espectador sobre el video */}
            <div className="video-controls">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
                <button 
                  onClick={toggleMute} 
                  className="btn" 
                  style={{ 
                    background: 'rgba(255,255,255,0.2)', 
                    color: '#fff',
                    border: 'none',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '8px'
                  }}
                >
                  {isMuted ? '🔇 Activar' : '🔊 Silenciar'}
                </button>
                
                {/* Control de volumen */}
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={volume}
                  onChange={handleVolumeChange}
                  style={{ 
                    width: '100px', 
                    accentColor: '#a855f7',
                    cursor: 'pointer'
                  }} 
                />
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'left', marginTop: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              * Puedes ajustar el volumen o silenciar el video usando los controles de la esquina inferior izquierda.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default PeerView
