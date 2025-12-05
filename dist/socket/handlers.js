"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSocketHandlers = registerSocketHandlers;
const game_1 = require("./game");
const redisClient_1 = require("../services/redisClient");
const rateLimiter_1 = require("../services/rateLimiter");
/**
 * Socket handlers (Render-ready and typed)
 */
function registerSocketHandlers(io, socket) {
    // Small helper to wrap replies
    const reply = (cb, ok, data = {}) => {
        if (cb && typeof cb === 'function')
            cb({ ok, ...data });
    };
    // Simple per-client rate limit (Render free tier safe)
    async function throttle(eventName) {
        const lim = await (0, rateLimiter_1.limitSocket)(socket.id);
        if (!lim.allowed) {
            console.warn(`Rate limited: ${eventName} by ${socket.id}`);
            socket.emit('rate_limited', { event: eventName });
            return false;
        }
        return true;
    }
    // CREATE ROOM
    socket.on('create_room', async ({ name }, cb) => {
        if (!(await throttle('create_room')))
            return reply(cb, false, { error: 'rate_limited' });
        try {
            const room = await (0, game_1.createRoomSkeleton)(name || 'Player');
            await (0, game_1.addPlayer)(room.id, socket.id, name || 'Player');
            socket.join(room.id);
            const state = await (0, redisClient_1.getRoom)(room.id);
            io.to(room.id).emit('room_state', state);
            reply(cb, true, { roomId: room.id });
        }
        catch (err) {
            console.error('create_room error:', err);
            reply(cb, false, { error: err.message });
        }
    });
    // JOIN ROOM
    socket.on('join_room', async ({ roomId, name }, cb) => {
        if (!(await throttle('join_room')))
            return reply(cb, false, { error: 'rate_limited' });
        try {
            await (0, game_1.addPlayer)(roomId, socket.id, name || 'Player');
            socket.join(roomId);
            const state = await (0, redisClient_1.getRoom)(roomId);
            io.to(roomId).emit('room_state', state);
            reply(cb, true);
        }
        catch (err) {
            console.error('join_room error:', err);
            reply(cb, false, { error: err.message });
        }
    });
    // SUBMIT SECRET
    socket.on('submit_secret', async ({ roomId, secret }, cb) => {
        if (!(await throttle('submit_secret')))
            return reply(cb, false, { error: 'rate_limited' });
        try {
            await (0, game_1.setSecret)(roomId, socket.id, secret);
            const state = await (0, redisClient_1.getRoom)(roomId);
            io.to(roomId).emit('room_state', state);
            reply(cb, true);
        }
        catch (err) {
            console.error('submit_secret error:', err);
            reply(cb, false, { error: err.message });
        }
    });
    // MAKE GUESS
    socket.on('make_guess', async ({ roomId, guess }, cb) => {
        if (!(await throttle('make_guess')))
            return reply(cb, false, { error: 'rate_limited' });
        try {
            const result = await (0, game_1.makeGuess)(roomId, socket.id, guess);
            // Return full guess result to THIS socket only
            socket.emit('guess_result', {
                guess,
                hint: result.hint,
                attempts: result.attempts,
                solved: result.solved,
            });
            // Notify opponent
            const room = await (0, redisClient_1.getRoom)(roomId);
            if (!room) {
                reply(cb, false, { error: 'room_missing_after_update' });
                return;
            }
            const opponentId = Object.keys(room.players).find((id) => id !== socket.id);
            if (opponentId) {
                io.to(opponentId).emit('opponent_guessed_notification', {
                    attemptsByOpponent: result.attempts,
                    opponentSolved: result.solved,
                });
            }
            // If both solved — broadcast endgame
            if (result.bothSolved) {
                const finalRoom = await (0, redisClient_1.getRoom)(roomId);
                if (!finalRoom) {
                    reply(cb, false, { error: 'final_room_missing' });
                    return;
                }
                // Cast values to PlayerState[] so TS knows what we're indexing
                const players = Object.values(finalRoom.players);
                // Defensive check: ensure we have two players
                if (!Array.isArray(players) || players.length < 2) {
                    // Fallback: broadcast whatever we have
                    io.to(roomId).emit('game_over', { winnerId: socket.id, players: finalRoom.players });
                    reply(cb, true);
                    return;
                }
                // Winner logic (typed)
                let winnerId = players[0].id;
                if (players[1].attempts < players[0].attempts) {
                    winnerId = players[1].id;
                }
                else if (players[1].attempts === players[0].attempts) {
                    const finished0 = players[0].finishedAt || 0;
                    const finished1 = players[1].finishedAt || 0;
                    winnerId = finished0 <= finished1 ? players[0].id : players[1].id;
                }
                io.to(roomId).emit('game_over', {
                    winnerId,
                    players: finalRoom.players,
                });
            }
            reply(cb, true);
        }
        catch (err) {
            console.error('make_guess error:', err);
            reply(cb, false, { error: err.message });
        }
    });
    // GET ROOM STATE
    socket.on('get_room_state', async ({ roomId }, cb) => {
        if (!(await throttle('get_room_state')))
            return reply(cb, false, { error: 'rate_limited' });
        try {
            const room = await (0, redisClient_1.getRoom)(roomId);
            reply(cb, true, { room });
        }
        catch (err) {
            console.error('get_room_state error:', err);
            reply(cb, false, { error: err.message });
        }
    });
}
