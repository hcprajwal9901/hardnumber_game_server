import Redis from 'ioredis';
import { REDIS_URL } from '../config';

// Upstash uses `rediss://` which requires TLS.
// Other Redis providers (local/docker) may use plain `redis://`.
// This block auto-detects correct TLS settings.

export const redis = new Redis(REDIS_URL, {
  // Enable TLS only when rediss:// is used
  tls: REDIS_URL.startsWith("rediss://") ? {} : undefined,
});

export async function getRoom(roomId: string) {
  const raw = await redis.get(`room:${roomId}`);
  return raw ? JSON.parse(raw) : null;
}

export async function saveRoom(roomId: string, room: any) {
  // Auto-expire room after 24 hours
  await redis.set(
    `room:${roomId}`,
    JSON.stringify(room),
    "EX",
    60 * 60 * 24
  );
}

export async function deleteRoom(roomId: string) {
  await redis.del(`room:${roomId}`);
}
