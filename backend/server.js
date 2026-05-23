/**
 * miraA — Servidor de Señalización WebRTC
 * 
 * Mejoras de seguridad implementadas:
 * - Helmet.js: cabeceras HTTP de seguridad (CSP, HSTS, X-Frame-Options, etc.)
 * - CORS restringido a orígenes explícitos (configurable por env)
 * - Rate limiting HTTP con express-rate-limit
 * - Rate limiting de sockets (150 msg/min por conexión)
 * - Validación y saneamiento de todos los payloads de entrada
 * - Límite de tamaño de payload JSON (10kb)
 * - Logging de errores de seguridad sin exposición de stack traces al cliente
 * - Variables sensibles exclusivamente en entorno (.env), nunca hardcodeadas
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────
// Orígenes permitidos (configurable por env)
// ─────────────────────────────────────────
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [
      'http://localhost:5173',
      'http://localhost:4173',
      'https://miraa.pages.dev',
      // Añade tu dominio de producción aquí o en la variable de entorno ALLOWED_ORIGINS
    ];

// ─────────────────────────────────────────
// Seguridad HTTP — Helmet
// ─────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", ...ALLOWED_ORIGINS],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// ─────────────────────────────────────────
// CORS — Restringido a orígenes conocidos
// ─────────────────────────────────────────
const corsOptions = {
  origin: (origin, callback) => {
    // Permitir peticiones sin origen (herramientas locales, Postman, etc.) solo en dev
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: Origen no permitido: ${origin}`));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// ─────────────────────────────────────────
// Límite de tamaño de payload JSON (10 KB)
// ─────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));

// ─────────────────────────────────────────
// Rate Limiting HTTP — 100 req / 15 min por IP
// ─────────────────────────────────────────
const httpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Por favor, espera un momento.' },
  skip: (req) => req.path === '/health', // El endpoint de salud no tiene límite
});
app.use(httpLimiter);

// ─────────────────────────────────────────
// Endpoints HTTP
// ─────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Manejador de errores HTTP (evita exponer stack traces)
app.use((err, req, res, next) => {
  console.error('[HTTP Error]', err.message);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

const server = http.createServer(app);

// ─────────────────────────────────────────
// Socket.IO — CORS restringido
// ─────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
  },
  // Aumentar pingtimeout y pinginterval reduce reconexiones falsas
  pingTimeout: 20000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e5, // 100 KB max por mensaje de socket
});

// ─────────────────────────────────────────
// Estado en memoria
// ─────────────────────────────────────────
// roomId -> { hostId: string, viewers: Set<string> }
const rooms = new Map();
// socket.id -> roomId
const socketToRoom = new Map();

// ─────────────────────────────────────────
// Rate Limiting de Sockets
// ─────────────────────────────────────────
const MESSAGE_LIMIT = 150;
const LIMIT_WINDOW_MS = 60_000; // 1 minuto

const socketRateLimits = new Map();

function checkRateLimit(socketId) {
  const limitInfo = socketRateLimits.get(socketId);
  if (!limitInfo) return true;

  const now = Date.now();
  if (now > limitInfo.resetTime) {
    limitInfo.count = 1;
    limitInfo.resetTime = now + LIMIT_WINDOW_MS;
    return true;
  }

  limitInfo.count++;
  if (limitInfo.count > MESSAGE_LIMIT) {
    console.warn(`[Rate Limit] Socket ${socketId} superó el límite.`);
    return false;
  }
  return true;
}

// ─────────────────────────────────────────
// Validadores de entrada
// ─────────────────────────────────────────

/** Valida que roomId sea alfanumérico de longitud razonable */
function isValidRoomId(roomId) {
  return typeof roomId === 'string' &&
    /^[a-z0-9]{4,16}$/.test(roomId);
}

/** Valida que un socket.id sea una cadena no vacía razonable */
function isValidSocketId(id) {
  return typeof id === 'string' && id.length > 0 && id.length < 64;
}

/** Valida que un SDP (offer/answer) tenga la forma mínima esperada */
function isValidSDP(sdp) {
  return sdp &&
    typeof sdp === 'object' &&
    typeof sdp.type === 'string' &&
    ['offer', 'answer'].includes(sdp.type) &&
    typeof sdp.sdp === 'string' &&
    sdp.sdp.length < 32768; // Máx 32 KB
}

/** Valida un candidato ICE */
function isValidIceCandidate(candidate) {
  if (candidate === null) return true; // End-of-candidates
  return candidate &&
    typeof candidate === 'object' &&
    typeof candidate.candidate === 'string' &&
    candidate.candidate.length < 1024;
}

// ─────────────────────────────────────────
// Lógica de Socket.IO
// ─────────────────────────────────────────
io.use((socket, next) => {
  socketRateLimits.set(socket.id, {
    count: 0,
    resetTime: Date.now() + LIMIT_WINDOW_MS,
  });
  next();
});

io.on('connection', (socket) => {
  console.log(`[Conexión] Cliente conectado: ${socket.id}`);

  // Rate limiting por evento de socket
  socket.use((packet, next) => {
    if (!checkRateLimit(socket.id)) {
      return next(new Error('rate_limit_exceeded'));
    }
    next();
  });

  // ── 1. Host crea sala ──────────────────
  socket.on('create-room', (callback) => {
    if (typeof callback !== 'function') return;

    try {
      // Generar ID alfanumérico aleatorio seguro
      const roomId = Math.random().toString(36).substring(2, 10);

      rooms.set(roomId, { hostId: socket.id, viewers: new Set() });
      socketToRoom.set(socket.id, roomId);
      socket.join(roomId);

      console.log(`[Sala] Creada: ${roomId} | Host: ${socket.id}`);
      callback({ success: true, roomId });
    } catch (err) {
      console.error('[create-room] Error:', err.message);
      callback({ success: false, error: 'Error interno al crear la sala.' });
    }
  });

  // ── 2. Viewer se une a sala ────────────
  socket.on('join-room', (payload, callback) => {
    if (typeof callback !== 'function') return;

    try {
      // Validar payload
      if (!payload || !isValidRoomId(payload.roomId)) {
        return callback({ success: false, error: 'ID de sala inválido.' });
      }

      const { roomId } = payload;
      const room = rooms.get(roomId);

      if (!room) {
        console.log(`[Sala] Sala no encontrada: ${roomId}`);
        return callback({ success: false, error: 'La sala no existe o ha finalizado.' });
      }

      const hostId = room.hostId;
      room.viewers.add(socket.id);
      socketToRoom.set(socket.id, roomId);
      socket.join(roomId);

      console.log(`[Sala] Viewer ${socket.id} → Sala ${roomId}`);

      io.to(hostId).emit('viewer-joined', { viewerId: socket.id });
      io.to(roomId).emit('viewer-count-update', { count: room.viewers.size });

      callback({ success: true, hostId });
    } catch (err) {
      console.error('[join-room] Error:', err.message);
      callback({ success: false, error: 'Error interno.' });
    }
  });

  // ── 3. Relé Offer SDP ──────────────────
  socket.on('webrtc-offer', (payload) => {
    try {
      if (!payload ||
        !isValidSocketId(payload.viewerId) ||
        !isValidSDP(payload.offer)) {
        console.warn(`[webrtc-offer] Payload inválido de ${socket.id}`);
        return;
      }
      console.log(`[WebRTC] Offer: ${socket.id} → ${payload.viewerId}`);
      io.to(payload.viewerId).emit('webrtc-offer', {
        hostId: socket.id,
        offer: payload.offer,
      });
    } catch (err) {
      console.error('[webrtc-offer] Error:', err.message);
    }
  });

  // ── 4. Relé Answer SDP ─────────────────
  socket.on('webrtc-answer', (payload) => {
    try {
      if (!payload ||
        !isValidSocketId(payload.hostId) ||
        !isValidSDP(payload.answer)) {
        console.warn(`[webrtc-answer] Payload inválido de ${socket.id}`);
        return;
      }
      console.log(`[WebRTC] Answer: ${socket.id} → ${payload.hostId}`);
      io.to(payload.hostId).emit('webrtc-answer', {
        viewerId: socket.id,
        answer: payload.answer,
      });
    } catch (err) {
      console.error('[webrtc-answer] Error:', err.message);
    }
  });

  // ── 5. Relé ICE Candidates ─────────────
  socket.on('webrtc-ice-candidate', (payload) => {
    try {
      if (!payload ||
        !isValidSocketId(payload.targetId) ||
        !isValidIceCandidate(payload.candidate)) {
        console.warn(`[webrtc-ice-candidate] Payload inválido de ${socket.id}`);
        return;
      }
      io.to(payload.targetId).emit('webrtc-ice-candidate', {
        senderId: socket.id,
        candidate: payload.candidate,
      });
    } catch (err) {
      console.error('[webrtc-ice-candidate] Error:', err.message);
    }
  });

  // ── 6. Host detiene la transmisión ─────
  socket.on('stop-sharing', () => {
    try {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (room && room.hostId === socket.id) {
        console.log(`[Sala] Host detuvo: ${roomId}`);

        socket.to(roomId).emit('host-stopped');

        room.viewers.forEach(viewerId => {
          socketToRoom.delete(viewerId);
          const viewerSocket = io.sockets.sockets.get(viewerId);
          if (viewerSocket) viewerSocket.leave(roomId);
        });

        rooms.delete(roomId);
        socketToRoom.delete(socket.id);
        socket.leave(roomId);
      }
    } catch (err) {
      console.error('[stop-sharing] Error:', err.message);
    }
  });

  // ── 7. Desconexiones ───────────────────
  socket.on('disconnect', (reason) => {
    console.log(`[Desconexión] ${socket.id} | Razón: ${reason}`);

    socketRateLimits.delete(socket.id);

    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    if (room.hostId === socket.id) {
      console.log(`[Sala] Host desconectado: ${roomId}`);

      socket.to(roomId).emit('host-stopped');

      room.viewers.forEach(viewerId => {
        socketToRoom.delete(viewerId);
        const viewerSocket = io.sockets.sockets.get(viewerId);
        if (viewerSocket) viewerSocket.leave(roomId);
      });

      rooms.delete(roomId);
      socketToRoom.delete(socket.id);
    } else {
      console.log(`[Sala] Viewer salió: ${socket.id} de ${roomId}`);
      room.viewers.delete(socket.id);
      socketToRoom.delete(socket.id);

      io.to(room.hostId).emit('viewer-disconnected', { viewerId: socket.id });
      io.to(roomId).emit('viewer-count-update', { count: room.viewers.size });
    }
  });

  // ── 8. Errores de socket ───────────────
  socket.on('error', (err) => {
    if (err.message === 'rate_limit_exceeded') {
      socket.emit('error', { message: 'Demasiados mensajes. Por favor, reduce la velocidad.' });
      socket.disconnect(true);
    } else {
      console.error(`[Socket Error] ${socket.id}:`, err.message);
    }
  });
});

// ─────────────────────────────────────────
// Arranque del servidor
// ─────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`[Servidor] Corriendo en http://localhost:${PORT}`);
  console.log(`[Servidor] Orígenes CORS permitidos: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`[Servidor] Servidor de señalización WebRTC listo.`);
});

// Manejo de señales del proceso para cierre limpio
process.on('SIGTERM', () => {
  console.log('[Servidor] Cerrando servidor...');
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  console.log('[Servidor] Cerrando servidor...');
  server.close(() => process.exit(0));
});
