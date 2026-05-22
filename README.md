# miraA - Aplicación de Screen Sharing en Tiempo Real (WebRTC)

`miraA` es una aplicación web moderna, premium y de baja latencia para compartir pantalla directamente desde el navegador hacia múltiples espectadores en tiempo real. Utiliza WebRTC nativo para la transmisión de video/audio y WebSockets para la señalización.

---

## 🚀 Arquitectura y Stack Tecnológico

La aplicación está diseñada bajo una arquitectura uno-a-muchos (Host-a-Espectadores) con señalización centralizada de baja latencia.

```
                  +----------------------------------+
                  |         SIGNALING SERVER         |
                  |     (Node.js + Express + Sockets)|
                  +----------------------------------+
                     ^                            ^
                     | (WebSocket)                | (WebSocket)
                     v                            v
          +--------------------+        +---------------------+
          |    HOST (Sender)   |        |  VIEWER (Receiver)  |
          |    Vite + React    |        |    Vite + React     |
          +--------------------+        +---------------------+
                     |                            ^
                     |          WebRTC Data       |
                     +----------------------------+
                           (Direct Stream Connection)
```

### Tecnologías Principales

#### 💻 Frontend
- **Framework:** [React 18 / Vite](https://vite.dev/) – Servido de forma estática, optimizado para carga ultrarrápida.
- **WebRTC:** API nativa del navegador (`RTCPeerConnection`) – Elimina dependencias externas pesadas y asegura soporte nativo de baja latencia.
- **Estilos:** CSS Vanilla Moderno – Diseño personalizado de alta gama con efecto *Glassmorphism*, paletas de colores sofisticadas en modo oscuro y claro, transiciones fluidas y diseño responsivo.
- **Comunicación en Tiempo Real:** [Socket.IO Client](https://socket.io/docs/v4/client-api/) – Para comunicación bidireccional inmediata con el servidor de señalización.

#### ⚙️ Backend
- **Entorno de Ejecución:** [Node.js](https://nodejs.org/)
- **Servidor Web:** [Express](https://expressjs.com/)
- **Mapeo de Sockets:** [Socket.IO](https://socket.io/) – Gestiona las conexiones activas, creación de salas y transferencia de SDPs (Offers/Answers) y candidatos ICE de WebRTC.
- **Seguridad:** Rate limiting básico integrado en sockets para evitar abusos y spam de solicitudes de conexión.

#### ☁️ Infraestructura de Despliegue (Recomendada y Gratuita)
- **Frontend Hosting:** [Cloudflare Pages](https://pages.cloudflare.com/) – Distribución global a través de CDN con soporte SSL y redirecciones de forma gratuita.
- **Backend Signaling:** [Render](https://render.com/) (Plan Web Service gratuito) o Railway.
- **STUN/TURN Servers:** [Metered.ca](https://www.metered.ca/) (Plan gratuito de 50GB mensuales) – Para garantizar la conectividad de los pares (peer-to-peer) incluso detrás de firewalls restrictivos (symmetric NATs).

---

## 🛠️ Flujo de Operación

1. **Creación de Transmisión (Host):**
   - El Host entra a la aplicación y presiona **"Comenzar a Compartir"**.
   - El navegador abre el selector nativo del sistema operativo (`navigator.mediaDevices.getDisplayMedia`) permitiendo elegir pantalla completa, ventana o pestaña, junto con la opción de incluir audio del sistema o del micrófono.
   - El Host se conecta al servidor de señalización, el cual crea una sala y devuelve un identificador único de sala (`roomId`).
   - Se genera una URL para los espectadores: `https://miraa.pages.dev/?room=<roomId>`.

2. **Conexión de Espectadores (Viewer):**
   - El Viewer accede a la URL compartida.
   - Envía una señal al servidor indicando que desea unirse a la sala con el `roomId` correspondiente.
   - El servidor de señalización notifica al Host que un nuevo espectador se ha unido.

3. **Negociación WebRTC (Signaling):**
   - El Host crea una nueva instancia de `RTCPeerConnection` dedicada a ese espectador y le añade la pista de video/audio de la pantalla compartida.
   - El Host genera un `offer` (SDP) y lo envía al espectador a través del servidor de señalización.
   - El espectador recibe el `offer`, genera un `answer` (SDP) y lo envía de regreso.
   - Ambos pares intercambian candidatos ICE recopilados para establecer la mejor ruta de conexión.

4. **Transmisión Directa:**
   - La conexión WebRTC se establece y los datos de video fluyen directamente de dispositivo a dispositivo (Peer-to-Peer) o a través de los servidores TURN si es necesario.
   - El Host puede monitorear la cantidad de espectadores conectados gracias a los eventos de unión/desconexión reportados por el socket.

---

## 📦 Estructura del Repositorio

```
miraA/
├── README.md             # Esta documentación
├── backend/              # Código del servidor de señalización
│   ├── package.json
│   ├── server.js
│   └── .env.example
└── frontend/             # Código de la interfaz de usuario en React
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css     # Estilos globales y temas
        └── components/
            ├── HostView.jsx
            └── PeerView.jsx
```

---

## 🚀 Instrucciones de Ejecución Local

### 1. Servidor de Señalización (Backend)
```bash
cd backend
npm install
npm start
```
*El servidor correrá en `http://localhost:5000` por defecto.*

### 2. Aplicación Frontend
```bash
cd frontend
npm install
npm run dev
```
*La aplicación frontend estará disponible en `http://localhost:5173`.*
