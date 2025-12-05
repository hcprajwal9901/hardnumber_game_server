"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.limitSocket = limitSocket;
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
// This rate limiter is applied to socket events to prevent spam,
// brute-force guessing, or denial-of-service style message flooding.
const limiter = new rate_limiter_flexible_1.RateLimiterMemory({
    points: 20, // 20 events
    duration: 3 // per 3 seconds
});
// Helper function to check if a socket can perform an action
async function limitSocket(socketId) {
    try {
        await limiter.consume(socketId);
        return { allowed: true };
    }
    catch {
        return { allowed: false };
    }
}
