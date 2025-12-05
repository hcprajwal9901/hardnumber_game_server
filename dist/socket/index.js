"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
const socket_io_1 = require("socket.io");
const handlers_1 = require("./handlers");
const redis_1 = require("redis");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const config_1 = require("../config");
async function initSocket(server) {
    const io = new socket_io_1.Server(server, {
        cors: { origin: '*' },
        path: '/socket.io'
    });
    // ─────────────────────────────────────────────
    // Redis Adapter for multi-instance scaling
    // Required on Render.com when multiple replicas run
    // Upstash requires TLS → rediss://
    // ─────────────────────────────────────────────
    const pubClient = (0, redis_1.createClient)({
        url: config_1.REDIS_URL,
        socket: config_1.REDIS_URL.startsWith('rediss://') ? { tls: true } : {}
    });
    const subClient = pubClient.duplicate();
    try {
        await pubClient.connect();
        await subClient.connect();
        io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
        console.log('[Socket.IO] Redis adapter connected');
    }
    catch (err) {
        console.error('[Socket.IO] Failed to connect Redis adapter:', err);
    }
    // ─────────────────────────────────────────────
    // Socket.IO event handlers
    // ─────────────────────────────────────────────
    io.on('connection', (socket) => {
        console.log('Socket connected:', socket.id);
        (0, handlers_1.registerSocketHandlers)(io, socket);
        socket.on('disconnect', () => {
            console.log('Socket disconnected:', socket.id);
        });
    });
    return io;
}
