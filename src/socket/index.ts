import { Server } from 'socket.io';
import { registerSocketHandlers } from './handlers';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { REDIS_URL } from '../config';

export async function initSocket(server: any) {
  const io = new Server(server, {
    cors: { origin: '*' },
    path: '/socket.io'
  });

  // ─────────────────────────────────────────────
  // Redis Adapter for multi-instance scaling
  // Required on Render.com when multiple replicas run
  // Upstash requires TLS → rediss://
  // ─────────────────────────────────────────────

  const pubClient = createClient({
    url: REDIS_URL,
    socket: REDIS_URL.startsWith('rediss://') ? { tls: true } : {}
  });

  const subClient = pubClient.duplicate();

  try {
    await pubClient.connect();
    await subClient.connect();

    io.adapter(createAdapter(pubClient, subClient));

    console.log('[Socket.IO] Redis adapter connected');
  } catch (err) {
    console.error('[Socket.IO] Failed to connect Redis adapter:', err);
  }

  // ─────────────────────────────────────────────
  // Socket.IO event handlers
  // ─────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    registerSocketHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  return io;
}
