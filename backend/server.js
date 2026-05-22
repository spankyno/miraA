const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configuración de Express
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

const server = http.createServer(app);

// Configuración de Socket.IO con CORS amplio
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Estructura para almacenar las salas de transmisión en memoria
// roomId -> { hostId: socket.id, viewers: Set([socket.id, ...]) }
const rooms = new Map();
// Mapeo rápido de socket.id -> roomId para limpieza rápida
const socketToRoom = new Map();

// Middleware básico de Rate Limiting para Sockets
// Limita a un máximo de 150 mensajes por minuto por conexión de socket
const MESSAGE_LIMIT = 150;
const LIMIT_WINDOW_MS = 60000; // 1 minuto

const socketRateLimits = new Map();

io.use((socket, next) => {
  socketRateLimits.set(socket.id, {
    count: 0,
    resetTime: Date.now() + LIMIT_WINDOW_MS
  });
  next();
});

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
    console.warn(`[Rate Limit] Socket ${socketId} superó el límite de mensajes.`);
    return false;
  }
  return true;
}

// Lógica de Socket.IO
io.on('connection', (socket) => {
  console.log(`[Conexión] Nuevo cliente conectado: ${socket.id}`);

  // Middleware interno para verificar rate limiting en cada evento entrante
  socket.use((packet, next) => {
    if (!checkRateLimit(socket.id)) {
      return next(new Error('Rate limit exceeded. Please slow down.'));
    }
    next();
  });

  // 1. Host crea una sala
  socket.on('create-room', (callback) => {
    try {
      // Generar un ID de sala único y legible (ej. room_123456789)
      const roomId = Math.random().toString(36).substring(2, 10);
      
      rooms.set(roomId, {
        hostId: socket.id,
        viewers: new Set()
      });
      socketToRoom.set(socket.id, roomId);
      socket.join(roomId);

      console.log(`[Sala] Sala creada: ${roomId} por el Host: ${socket.id}`);
      
      if (typeof callback === 'function') {
        callback({ success: true, roomId });
      }
    } catch (err) {
      console.error('Error al crear sala:', err);
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Internal server error' });
      }
    }
  });

  // 2. Viewer se une a una sala
  socket.on('join-room', ({ roomId }, callback) => {
    try {
      const room = rooms.get(roomId);

      if (!room) {
        console.log(`[Sala] Intento fallido de unirse. Sala no encontrada: ${roomId}`);
        if (typeof callback === 'function') {
          callback({ success: false, error: 'La sala de transmisión no existe o ha finalizado.' });
        }
        return;
      }

      const hostId = room.hostId;
      
      // Registrar viewer
      room.viewers.add(socket.id);
      socketToRoom.set(socket.id, roomId);
      socket.join(roomId);

      console.log(`[Sala] Viewer ${socket.id} se unió a la sala ${roomId}`);

      // Notificar al Host que hay un nuevo viewer conectado para iniciar la oferta WebRTC
      io.to(hostId).emit('viewer-joined', { viewerId: socket.id });

      // Enviar la cantidad actual de viewers en la sala a todos
      io.to(roomId).emit('viewer-count-update', { count: room.viewers.size });

      if (typeof callback === 'function') {
        callback({ success: true, hostId });
      }
    } catch (err) {
      console.error('Error al unirse a la sala:', err);
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Internal server error' });
      }
    }
  });

  // 3. Relé WebRTC: Envío de Oferta SDP (del Host al Viewer específico)
  socket.on('webrtc-offer', ({ viewerId, offer }) => {
    console.log(`[WebRTC] Reenviando offer del Host (${socket.id}) al Viewer (${viewerId})`);
    io.to(viewerId).emit('webrtc-offer', {
      hostId: socket.id,
      offer
    });
  });

  // 4. Relé WebRTC: Envío de Respuesta SDP (del Viewer al Host)
  socket.on('webrtc-answer', ({ hostId, answer }) => {
    console.log(`[WebRTC] Reenviando answer del Viewer (${socket.id}) al Host (${hostId})`);
    io.to(hostId).emit('webrtc-answer', {
      viewerId: socket.id,
      answer
    });
  });

  // 5. Relé WebRTC: Envío de Candidatos ICE
  socket.on('webrtc-ice-candidate', ({ targetId, candidate }) => {
    // targetId puede ser el socket.id del host o de un viewer específico
    io.to(targetId).emit('webrtc-ice-candidate', {
      senderId: socket.id,
      candidate
    });
  });

  // 6. Detención manual de la transmisión por parte del Host
  socket.on('stop-sharing', () => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (room && room.hostId === socket.id) {
      console.log(`[Sala] Host detuvo la transmisión en sala: ${roomId}`);
      
      // Notificar a todos los viewers de la sala
      socket.to(roomId).emit('host-stopped');
      
      // Limpiar sala
      room.viewers.forEach(viewerId => {
        socketToRoom.delete(viewerId);
        const viewerSocket = io.sockets.sockets.get(viewerId);
        if (viewerSocket) viewerSocket.leave(roomId);
      });
      
      rooms.delete(roomId);
      socketToRoom.delete(socket.id);
      socket.leave(roomId);
    }
  });

  // 7. Manejo de desconexiones
  socket.on('disconnect', () => {
    console.log(`[Desconexión] Cliente desconectado: ${socket.id}`);
    
    // Limpiar rate limits para liberar memoria
    socketRateLimits.delete(socket.id);

    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    // Si el que se desconecta es el Host
    if (room.hostId === socket.id) {
      console.log(`[Desconexión] El Host de la sala ${roomId} se ha desconectado.`);
      
      // Notificar a los viewers y limpiar
      socket.to(roomId).emit('host-stopped');
      
      room.viewers.forEach(viewerId => {
        socketToRoom.delete(viewerId);
        const viewerSocket = io.sockets.sockets.get(viewerId);
        if (viewerSocket) viewerSocket.leave(roomId);
      });

      rooms.delete(roomId);
      socketToRoom.delete(socket.id);
    } else {
      // Si el que se desconecta es un Viewer
      console.log(`[Desconexión] Viewer ${socket.id} salió de la sala ${roomId}`);
      room.viewers.delete(socket.id);
      socketToRoom.delete(socket.id);

      // Notificar al Host para que destruya la conexión con ese viewer
      io.to(room.hostId).emit('viewer-disconnected', { viewerId: socket.id });

      // Actualizar conteo de espectadores
      io.to(roomId).emit('viewer-count-update', { count: room.viewers.size });
    }
  });
});

// Arrancar el servidor
server.listen(PORT, () => {
  console.log(`[Servidor] Corriendo en http://localhost:${PORT}`);
  console.log(`[Servidor] Servidor de señalización WebRTC listo.`);
});
