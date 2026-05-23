import React, { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

function HostView({ signalServerUrl }) {
  const [stream, setStream] = useState(null)
  const [roomId, setRoomId] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const [viewerCount, setViewerCount] = useState(0)
  const [sourceType, setSourceType] = useState('screen') // 'screen' o 'webcam'
  const [shareAudio, setShareAudio] = useState(true)
  const [isAudioMuted, setIsAudioMuted] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const socketRef = useRef(null)
  const localVideoRef = useRef(null)
  const streamRef = useRef(null)
  
  // Mapa de conexiones WebRTC activas: viewerId -> RTCPeerConnection
  const peersRef = useRef(new Map())

  // Servidores STUN recomendados (gratuitos e inmediatos).
  // Nota: Para soporte TURN completo detras de NATs simétricas, se recomienda usar Metered.ca como indica el README.
  const iceServersConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  }

  // Limpieza al desmontar el componente
  useEffect(() => {
    return () => {
      stopTransmission()
    }
  }, [])

  // Reproducir localmente de forma segura cuando el elemento se monta y el stream está listo
  useEffect(() => {
    if (isSharing && stream && localVideoRef.current) {
      localVideoRef.current.srcObject = stream
    }
  }, [isSharing, stream])

  // Iniciar la transmisión
  const startTransmission = async () => {
    setErrorMsg('')
    try {
      let mediaStream = null
      
      if (sourceType === 'screen') {
        // Capturar pantalla/ventana/pestaña nativa del navegador
        mediaStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: shareAudio ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } : false
        })
      } else {
        // Capturar Webcam
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: shareAudio
        })
      }

      streamRef.current = mediaStream
      setStream(mediaStream)
      setIsSharing(true)

      // (La reproducción local se maneja reactivamente en el useEffect correspondiente)

      // Escuchar si el usuario finaliza la transmisión desde el banner nativo del navegador
      const videoTrack = mediaStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.onended = () => {
          stopTransmission()
        }
      }

      // Inicializar conexión con servidor de señalización
      initSignaling(mediaStream)

    } catch (err) {
      console.error('Error al capturar pantalla/cámara:', err)
      if (err.name === 'NotAllowedError') {
        setErrorMsg('Permiso denegado. Para compartir necesitas otorgar permisos en el navegador.')
      } else {
        setErrorMsg('No se pudo acceder al dispositivo de captura. Verifica tus permisos y conexiones.')
      }
    }
  }

  // Configuración de señalización con Socket.IO
  const initSignaling = (mediaStream) => {
    const socket = io(signalServerUrl)
    socketRef.current = socket

    socket.on('connect', () => {
      setErrorMsg('') // Limpiar error de conexión previo al conectar con éxito
      console.log('Conectado al servidor de señalización. Creando sala...')
      
      // Crear sala
      socket.emit('create-room', (response) => {
        if (response.success) {
          setRoomId(response.roomId)
        } else {
          setErrorMsg('Error al crear la sala de transmisión en el servidor.')
          stopTransmission()
        }
      })
    })

    socket.on('connect_error', () => {
      setErrorMsg('Error de conexión con el servidor de señalización. Reintentando...')
    })

    // 1. Cuando un Viewer se conecta a la sala
    socket.on('viewer-joined', async ({ viewerId }) => {
      console.log(`Nuevo viewer conectado: ${viewerId}. Iniciando oferta WebRTC...`)
      
      try {
        // Crear un RTCPeerConnection para este Viewer específico
        const pc = new RTCPeerConnection(iceServersConfig)
        peersRef.current.set(viewerId, pc)

        // Añadir tracks del stream local a esta conexión
        mediaStream.getTracks().forEach(track => {
          pc.addTrack(track, mediaStream)
        })

        // Enviar candidatos ICE al Viewer a través del servidor
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('webrtc-ice-candidate', {
              targetId: viewerId,
              candidate: event.candidate
            })
          }
        }

        // Crear oferta SDP
        const offer = await pc.createOffer({
          offerToReceiveVideo: false,
          offerToReceiveAudio: false
        })
        await pc.setLocalDescription(offer)

        // Enviar oferta al Viewer específico
        socket.emit('webrtc-offer', { viewerId, offer })

      } catch (err) {
        console.error(`Error al establecer WebRTC con viewer ${viewerId}:`, err)
      }
    })

    // 2. Al recibir respuesta SDP del Viewer
    socket.on('webrtc-answer', async ({ viewerId, answer }) => {
      console.log(`Respuesta SDP recibida de viewer: ${viewerId}`)
      const pc = peersRef.current.get(viewerId)
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer))
          
          // Procesar candidatos ICE encolados
          if (pc.iceQueue) {
            console.log(`[WebRTC] Procesando ${pc.iceQueue.length} candidatos ICE encolados para viewer ${viewerId}`)
            for (const cand of pc.iceQueue) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand))
              } catch (err) {
                console.error('Error al procesar ICE Candidate en cola:', err)
              }
            }
            pc.iceQueue = []
          }
        } catch (err) {
          console.error('Error al definir Remote Description del viewer:', err)
        }
      }
    })

    // 3. Al recibir candidatos ICE del Viewer
    socket.on('webrtc-ice-candidate', async ({ senderId, candidate }) => {
      const pc = peersRef.current.get(senderId)
      if (pc) {
        if (pc.remoteDescription && candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
          } catch (err) {
            console.error('Error al agregar ICE Candidate del viewer:', err)
          }
        } else if (candidate) {
          // Encolar candidato si aún no se tiene la descripción remota
          if (!pc.iceQueue) {
            pc.iceQueue = []
          }
          pc.iceQueue.push(candidate)
        }
      }
    })

    // 4. Al desconectarse un Viewer
    socket.on('viewer-disconnected', ({ viewerId }) => {
      console.log(`Viewer desconectado: ${viewerId}. Limpiando peer...`)
      closePeerConnection(viewerId)
    })

    // 5. Actualización del número de viewers
    socket.on('viewer-count-update', ({ count }) => {
      setViewerCount(count)
    })
  }

  // Cerrar y limpiar conexión de un par específico
  const closePeerConnection = (viewerId) => {
    const pc = peersRef.current.get(viewerId)
    if (pc) {
      pc.close()
      peersRef.current.delete(viewerId)
    }
  }

  // Detener la transmisión y resetear estados
  const stopTransmission = () => {
    setIsSharing(false)
    setRoomId('')
    setViewerCount(0)

    // Detener tracks del stream de captura
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setStream(null)

    // Cerrar todas las conexiones WebRTC
    peersRef.current.forEach((pc, viewerId) => {
      pc.close()
    })
    peersRef.current.clear()

    // Desconectar Socket
    if (socketRef.current) {
      socketRef.current.emit('stop-sharing')
      socketRef.current.disconnect()
      socketRef.current = null
    }
  }

  // Copiar link al portapapeles
  const copyInvitationLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`
    navigator.clipboard.writeText(link).then(() => {
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    })
  }

  // Encender/Apagar audio de la transmisión local
  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks()
      if (audioTracks.length > 0) {
        const newState = !audioTracks[0].enabled
        audioTracks[0].enabled = newState
        setIsAudioMuted(!newState)
      } else {
        // En caso de que no se haya capturado audio inicialmente
        setErrorMsg('No hay pista de audio disponible en esta transmisión.')
        setTimeout(() => setErrorMsg(''), 4000)
      }
    }
  }

  return (
    <div className="glass-panel wide">
      {!isSharing ? (
        // Vista de Configuración Inicial
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
          <h1 className="title">Comparte tu pantalla al instante</h1>
          <p className="subtitle">Sin aplicaciones, sin configuraciones complejas. Calidad HD y latencia cero.</p>
          
          {errorMsg && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid var(--accent-red)', 
              color: 'var(--accent-red)',
              padding: '1rem',
              borderRadius: '12px',
              marginBottom: '2rem',
              fontSize: '0.95rem'
            }}>
              {errorMsg}
            </div>
          )}

          {/* Opciones de Transmisión */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem' }}>
            
            {/* Selector de Fuente */}
            <div style={{ 
              display: 'inline-flex', 
              background: 'var(--input-bg)', 
              border: '1px solid var(--input-border)',
              padding: '4px',
              borderRadius: '14px'
            }}>
              <button 
                className={`btn ${sourceType === 'screen' ? 'btn-primary' : ''}`}
                style={{ borderRadius: '10px', border: 'none', padding: '0.6rem 1.5rem' }}
                onClick={() => setSourceType('screen')}
              >
                🖥️ Pantalla / Pestaña
              </button>
              <button 
                className={`btn ${sourceType === 'webcam' ? 'btn-primary' : ''}`}
                style={{ borderRadius: '10px', border: 'none', padding: '0.6rem 1.5rem' }}
                onClick={() => setSourceType('webcam')}
              >
                📷 Cámara / Webcam
              </button>
            </div>

            {/* Checkbox de Audio */}
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: '0.95rem'
            }}>
              <input 
                type="checkbox" 
                checked={shareAudio} 
                onChange={(e) => setShareAudio(e.target.checked)}
                style={{ 
                  width: '18px', 
                  height: '18px', 
                  accentColor: '#a855f7',
                  cursor: 'pointer'
                }} 
              />
              Transmitir audio del sistema / micrófono
            </label>
          </div>

          <button onClick={startTransmission} className="hero-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Comenzar a Compartir
          </button>
        </div>
      ) : (
        // Vista de Transmisión Activa (Dashboard)
        <div className="host-dashboard">
          
          {/* Header del Dashboard */}
          <div className="host-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span className="status-badge live">
                <span className="dot"></span>
                Transmitiendo
              </span>
              <span className="viewer-count">
                👤 {viewerCount} {viewerCount === 1 ? 'espectador' : 'espectadores'}
              </span>
            </div>
            
            <button onClick={stopTransmission} className="btn btn-danger">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              </svg>
              Detener Transmisión
            </button>
          </div>

          {errorMsg && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: 'var(--accent-red)',
              padding: '0.75rem',
              borderRadius: '10px',
              fontSize: '0.9rem',
              textAlign: 'left'
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Reproductor de Vista Previa */}
          <div className="video-wrapper">
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted // MUY IMPORTANTE para evitar acoplamiento de audio en la pc del host
              className="video-element"
            />
            <div className="video-controls" style={{ opacity: 1 }}>
              <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>Vista previa del Host</span>
              <button 
                onClick={toggleAudio} 
                className="btn" 
                style={{ 
                  background: isAudioMuted ? 'var(--accent-red)' : 'rgba(255,255,255,0.2)', 
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem'
                }}
              >
                {isAudioMuted ? '🔇 Activar Audio' : '🔊 Silenciar Audio'}
              </button>
            </div>
          </div>

          {/* Compartir Enlace */}
          <div className="host-footer">
            <div style={{ textAlign: 'left', flex: 1, minWidth: '250px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: '600' }}>
                ENLACE PARA LOS ESPECTADORES
              </p>
              <div className="share-box">
                <span className="share-link">
                  {`${window.location.origin}${window.location.pathname}?room=${roomId}`}
                </span>
                <button 
                  onClick={copyInvitationLink} 
                  className={`btn ${copyFeedback ? 'btn-primary' : ''}`}
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
                >
                  {copyFeedback ? '¡Copiado! ✓' : 'Copiar Enlace'}
                </button>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

export default HostView
