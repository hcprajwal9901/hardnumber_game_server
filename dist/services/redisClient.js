"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.getRoom = getRoom;
exports.saveRoom = saveRoom;
exports.deleteRoom = deleteRoom;
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("../config");
// Upstash uses `rediss://` which requires TLS.
// Other Redis providers (local/docker) may use plain `redis://`.
// This block auto-detects correct TLS settings.
exports.redis = new ioredis_1.default(config_1.REDIS_URL, {
    // Enable TLS only when rediss:// is used
    tls: config_1.REDIS_URL.startsWith("rediss://") ? {} : undefined,
});
async function getRoom(roomId) {
    const raw = await exports.redis.get(`room:${roomId}`);
    return raw ? JSON.parse(raw) : null;
}
async function saveRoom(roomId, room) {
    // Auto-expire room after 24 hours
    await exports.redis.set(`room:${roomId}`, JSON.stringify(room), "EX", 60 * 60 * 24);
}
async function deleteRoom(roomId) {
    await exports.redis.del(`room:${roomId}`);
}
