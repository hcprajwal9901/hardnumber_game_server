import { RateLimiterMemory } from 'rate-limiter-flexible';

// This rate limiter is applied to socket events to prevent spam,
// brute-force guessing, or denial-of-service style message flooding.

const limiter = new RateLimiterMemory({
  points: 20,      // 20 events
  duration: 3      // per 3 seconds
});

// Helper function to check if a socket can perform an action
export async function limitSocket(socketId: string) {
  try {
    await limiter.consume(socketId);
    return { allowed: true };
  } catch {
    return { allowed: false };
  }
}
