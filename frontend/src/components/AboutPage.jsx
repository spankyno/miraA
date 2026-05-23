import React, { useState } from 'react'

const faqs = [
  {
    q: '¿Necesito instalar algo para usar miraA?',
    a: 'No. miraA funciona íntegramente en el navegador. No necesitas instalar ninguna extensión, plugin ni aplicación adicional. Solo abre el enlace y empieza a compartir.'
  },
  {
    q: '¿Es segura mi transmisión?',
    a: 'Sí. Todo el tráfico de medios (video/audio) viaja cifrado de extremo a extremo mediante WebRTC con DTLS-SRTP. El servidor de señalización únicamente facilita el handshake inicial y nunca accede al contenido de tu pantalla.'
  },
  {
    q: '¿Cuántos espectadores pueden unirse a una sesión?',
    a: 'No hay un límite fijo impuesto por la aplicación. En la práctica, el número de espectadores estará limitado por los recursos del dispositivo del host, ya que se establece una conexión WebRTC independiente por cada espectador.'
  },
  {
    q: '¿Qué pasa si cierro el navegador?',
    a: 'La transmisión finaliza automáticamente. Todos los espectadores recibirán una notificación de que el host ha detenido la sesión y la sala se elimina del servidor.'
  },
  {
    q: '¿Puedo compartir audio junto con la pantalla?',
    a: 'Sí. Al iniciar la transmisión, puedes activar la opción de incluir audio del sistema o del micrófono. El soporte exacto depende del navegador y el sistema operativo (Chrome en Windows ofrece el soporte más completo).'
  },
  {
    q: '¿Funciona en dispositivos móviles?',
    a: 'Los espectadores pueden ver transmisiones desde cualquier dispositivo con un navegador moderno. La función de compartir pantalla como host tiene soporte limitado en móviles (iOS y Android aún no soportan getDisplayMedia completamente).'
  },
  {
    q: '¿Qué ocurre si tengo una conexión inestable?',
    a: 'La aplicación intentará reconectarse automáticamente al servidor de señalización. La calidad de la transmisión WebRTC se adapta dinámicamente al ancho de banda disponible.'
  },
  {
    q: '¿Mis datos se almacenan en algún servidor?',
    a: 'No. El contenido de tu pantalla nunca pasa por nuestros servidores; va directamente al espectador por WebRTC P2P. El servidor solo gestiona metadatos de sala (IDs temporales) y se borran al finalizar la sesión.'
  },
  {
    q: '¿Cuánto tiempo dura una sesión?',
    a: 'No hay límite de tiempo. La sesión dura mientras el host mantenga la transmisión activa. Las salas se eliminan automáticamente al desconectarse el host.'
  },
  {
    q: '¿Cuánto uso gratuito tengo como usuario no registrado?',
    a: 'Los usuarios no registrados disponen de 30 minutos de uso al mes. Para uso ilimitado, regístrate de forma gratuita con tu cuenta.'
  }
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="faq-item"
      style={{
        borderBottom: '1px solid var(--panel-border)',
        padding: '1.25rem 0'
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          color: 'var(--text-main)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '1rem',
          fontWeight: '600',
          textAlign: 'left',
          gap: '1rem',
          padding: 0
        }}
      >
        <span>{q}</span>
        <span style={{
          fontSize: '1.4rem',
          lineHeight: 1,
          color: '#a855f7',
          transition: 'transform 0.25s',
          transform: open ? 'rotate(45deg)' : 'rotate(0)'
        }}>+</span>
      </button>
      {open && (
        <p style={{
          marginTop: '0.85rem',
          color: 'var(--text-secondary)',
          fontSize: '0.95rem',
          lineHeight: '1.7'
        }}>
          {a}
        </p>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: '3rem' }}>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: 700,
        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '1.25rem',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid var(--panel-border)'
      }}>{title}</h2>
      {children}
    </section>
  )
}

function Badge({ children, color = '#6366f1' }) {
  return (
    <span style={{
      display: 'inline-block',
      background: `${color}22`,
      border: `1px solid ${color}55`,
      color: color,
      borderRadius: '6px',
      padding: '0.2rem 0.65rem',
      fontSize: '0.82rem',
      fontWeight: 600,
      marginRight: '0.4rem',
      marginBottom: '0.4rem'
    }}>
      {children}
    </span>
  )
}

function AboutPage() {
  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* Hero */}
      <div style={{
        textAlign: 'center',
        marginBottom: '3.5rem',
        padding: '2rem 0'
      }}>
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '1rem',
          letterSpacing: '-0.03em'
        }}>
          Acerca de miraA
        </h1>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '1.15rem',
          maxWidth: '620px',
          margin: '0 auto',
          lineHeight: 1.7
        }}>
          Compartir pantalla en tiempo real sin instalaciones. Todo el poder de WebRTC,
          sin la complejidad. Directo en tu navegador.
        </p>
      </div>

      {/* Kick Start Guide */}
      <Section title="🚀 Guía de inicio rápido">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {[
            {
              n: '1', title: 'Accede a la aplicación',
              desc: 'Abre miraA en cualquier navegador moderno (Chrome, Firefox, Edge, Safari). No necesitas instalar nada.'
            },
            {
              n: '2', title: 'Elige tu fuente',
              desc: 'Selecciona si quieres compartir tu pantalla completa, una ventana específica, una pestaña del navegador, o tu webcam.'
            },
            {
              n: '3', title: 'Activa el audio (opcional)',
              desc: 'Marca la opción para incluir el audio de tu sistema o micrófono en la transmisión. Compatible con Chrome en Windows para audio de sistema.'
            },
            {
              n: '4', title: 'Pulsa "Comenzar a Compartir"',
              desc: 'El navegador te pedirá permiso para capturar la pantalla. Acepta y la transmisión comenzará de inmediato.'
            },
            {
              n: '5', title: 'Comparte el enlace',
              desc: 'Se generará una URL única. Cópiala y envíala a tus espectadores. Ellos solo tienen que abrir el enlace en su navegador, sin registro.'
            },
            {
              n: '6', title: 'Detén cuando quieras',
              desc: 'Pulsa "Detener Transmisión" o cierra la pestaña. La sala se elimina automáticamente y los espectadores son notificados.'
            }
          ].map(step => (
            <div key={step.n} style={{
              display: 'flex',
              gap: '1.25rem',
              alignItems: 'flex-start',
              background: 'var(--panel-bg)',
              border: '1px solid var(--panel-border)',
              borderRadius: '14px',
              padding: '1.25rem'
            }}>
              <div style={{
                minWidth: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.1rem',
                color: '#fff',
                flexShrink: 0
              }}>
                {step.n}
              </div>
              <div>
                <p style={{ fontWeight: 700, marginBottom: '0.3rem' }}>{step.title}</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Stack tecnológico */}
      <Section title="⚙️ Stack tecnológico">
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
          miraA está construida sobre tecnologías modernas, abiertas y de alto rendimiento.
          Sin dependencias propietarias. Sin rastreadores de terceros.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
          {[
            {
              icon: '💻', title: 'Frontend',
              items: [
                { name: 'React 18', desc: 'Interfaz reactiva de alto rendimiento' },
                { name: 'Vite', desc: 'Build tool ultrarrápido con HMR' },
                { name: 'WebRTC nativo', desc: 'RTCPeerConnection sin librerías pesadas' },
                { name: 'Socket.IO Client', desc: 'Señalización en tiempo real' },
                { name: 'Clerk', desc: 'Autenticación y gestión de usuarios' },
                { name: 'CSS Glassmorphism', desc: 'UI premium con temas claro/oscuro' }
              ]
            },
            {
              icon: '⚙️', title: 'Backend / Señalización',
              items: [
                { name: 'Node.js', desc: 'Entorno de ejecución eficiente' },
                { name: 'Express', desc: 'Servidor HTTP minimalista' },
                { name: 'Socket.IO', desc: 'WebSockets con reconexión automática' },
                { name: 'Rate Limiting', desc: '150 msg/min por socket para evitar abusos' },
                { name: 'Helmet.js', desc: 'Cabeceras HTTP de seguridad' },
                { name: 'CORS configurado', desc: 'Orígenes permitidos restringidos' }
              ]
            },
            {
              icon: '☁️', title: 'Infraestructura',
              items: [
                { name: 'Cloudflare Pages', desc: 'CDN global, SSL automático' },
                { name: 'Render / Railway', desc: 'Hosting del servidor de señalización' },
                { name: 'Metered STUN/TURN', desc: 'Conectividad P2P detrás de NAT' },
                { name: 'DTLS-SRTP', desc: 'Cifrado de medios de extremo a extremo' }
              ]
            }
          ].map(cat => (
            <div key={cat.title} style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--panel-border)',
              borderRadius: '16px',
              padding: '1.5rem'
            }}>
              <p style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '1rem' }}>
                {cat.icon} {cat.title}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {cat.items.map(i => (
                  <div key={i.name}>
                    <span style={{ fontWeight: 600, color: '#a855f7', fontSize: '0.9rem' }}>{i.name}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}> — {i.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Seguridad */}
      <Section title="🔒 Seguridad">
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
          La privacidad y seguridad son pilares fundamentales de miraA. A continuación se detallan las
          medidas implementadas en cada capa de la aplicación.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {[
            {
              icon: '🔐', title: 'Cifrado de extremo a extremo',
              desc: 'El contenido de tu pantalla viaja cifrado mediante DTLS-SRTP. El servidor de señalización solo intercambia metadatos (IDs, SDPs) y nunca accede al flujo de medios.'
            },
            {
              icon: '🛡️', title: 'Sin almacenamiento persistente',
              desc: 'Las salas son volátiles. Los datos de la sesión (roomId, IDs de sockets) se almacenan solo en memoria RAM y se eliminan al finalizar la transmisión.'
            },
            {
              icon: '⚡', title: 'Rate limiting de sockets',
              desc: 'Cada conexión tiene un límite de 150 mensajes por minuto. Los sockets que lo superen son desconectados automáticamente, previniendo ataques de flooding.'
            },
            {
              icon: '🌐', title: 'Cabeceras HTTP seguras',
              desc: 'El servidor aplica Helmet.js para configurar Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, HSTS y otras cabeceras de seguridad críticas.'
            },
            {
              icon: '🔑', title: 'Autenticación con Clerk',
              desc: 'La gestión de identidades usa Clerk: OAuth seguro, tokens JWT firmados, sin contraseñas almacenadas por miraA. Los usuarios no registrados tienen acceso limitado de 30 min/mes.'
            },
            {
              icon: '🧱', title: 'Validación de entrada',
              desc: 'Todos los payloads recibidos por el servidor se validan en tipo y longitud antes de procesarse, evitando inyecciones y manejo de datos maliciosos.'
            }
          ].map(item => (
            <div key={item.title} style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--panel-border)',
              borderRadius: '14px',
              padding: '1.25rem'
            }}>
              <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{item.icon} {item.title}</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Compatibilidad */}
      <Section title="🖥️ Compatibilidad de plataforma">
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
          miraA usa APIs estándar del navegador. La compatibilidad varía según el rol (host/espectador) y el
          soporte de <code style={{ background: 'var(--input-bg)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.85rem' }}>getDisplayMedia</code> en cada entorno.
        </p>

        <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid var(--panel-border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
            <thead>
              <tr style={{ background: 'var(--panel-bg)' }}>
                {['Plataforma / Navegador', 'Compartir (Host)', 'Ver (Espectador)', 'Audio de sistema', 'Notas'].map(h => (
                  <th key={h} style={{
                    padding: '0.85rem 1rem',
                    textAlign: 'left',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    borderBottom: '1px solid var(--panel-border)'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Chrome (Windows / macOS)', '✅ Completo', '✅ Completo', '✅ Windows / ⚠️ macOS', 'Mejor compatibilidad global'],
                ['Firefox (Windows / macOS)', '✅ Completo', '✅ Completo', '❌ No soportado', 'Sin audio de sistema'],
                ['Edge (Chromium)', '✅ Completo', '✅ Completo', '✅ Windows', 'Similar a Chrome'],
                ['Safari (macOS 13+)', '⚠️ Parcial', '✅ Completo', '❌ No soportado', 'Requiere activar flag WebRTC'],
                ['Chrome (Android)', '⚠️ Limitado', '✅ Completo', '❌ No soportado', 'getDisplayMedia en desarrollo'],
                ['Safari (iOS)', '❌ No soportado', '✅ Completo', '❌ No soportado', 'iOS no permite captura de pantalla'],
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                  {row.map((cell, j) => (
                    <td key={j} style={{
                      padding: '0.8rem 1rem',
                      color: j === 0 ? 'var(--text-main)' : 'var(--text-secondary)',
                      fontWeight: j === 0 ? 600 : 400
                    }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '1rem' }}>
          ✅ Soporte completo &nbsp;·&nbsp; ⚠️ Soporte parcial o con limitaciones &nbsp;·&nbsp; ❌ No soportado
        </p>
      </Section>

      {/* FAQ */}
      <Section title="❓ Preguntas frecuentes">
        <div>
          {faqs.map((faq, i) => (
            <FaqItem key={i} q={faq.q} a={faq.a} />
          ))}
        </div>
      </Section>

      {/* Back button */}
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <a
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            color: '#fff',
            padding: '0.85rem 2rem',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '1rem',
            textDecoration: 'none',
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          ← Volver a miraA
        </a>
      </div>
    </div>
  )
}

export default AboutPage
