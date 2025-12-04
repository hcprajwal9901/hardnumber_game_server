import { Server, Socket } from 'socket.io';
import {
  createRoomSkeleton,
  addPlayer,
  setSecret,
  makeGuess
} from './game';
import { getRoom } from '../services/redisClient';
import { limitSocket } from '../services/rateLimiter';

export function registerSocketHandlers(io: Server, socket: Socket) {

  // Small helper to wrap replies
  const reply = (cb: any, ok: boolean, data: any = {}) => {
    if (cb && typeof cb === "function") cb({ ok, ...data });
  };

  // Simple per-client rate limit (Render free tier safe)
  async function throttle(eventName: string): Promise<boolean> {
    const lim = await limitSocket(socket.id);
    if (!lim.allowed) {
      console.warn(`Rate limited: ${eventName} by ${socket.id}`);
      socket.emit("rate_limited", { event: eventName });
      return false;
    }
    return true;
  }

  // ─────────────────────────────────────────────
  // CREATE ROOM
  // ─────────────────────────────────────────────
  socket.on('create_room', async ({ name }, cb) => {
    if (!(await throttle("create_room"))) return reply(cb, false, { error: "rate_limited" });

    try {
      const room = await createRoomSkeleton(name || "Player");
      await addPlayer(room.id, socket.id, name || "Player");

      socket.join(room.id);

      const state = await getRoom(room.id);
      io.to(room.id).emit('room_state', state);

      reply(cb, true, { roomId: room.id });

    } catch (err: any) {
      console.error("create_room error:", err);
      reply(cb, false, { error: err.message });
    }
  });

  // ─────────────────────────────────────────────
  // JOIN ROOM
  // ─────────────────────────────────────────────
  socket.on('join_room', async ({ roomId, name }, cb) => {
    if (!(await throttle("join_room"))) return reply(cb, false, { error: "rate_limited" });

    try {
      await addPlayer(roomId, socket.id, name || "Player");
      socket.join(roomId);

      const state = await getRoom(roomId);
      io.to(roomId).emit('room_state', state);

      reply(cb, true);

    } catch (err: any) {
      console.error("join_room error:", err);
      reply(cb, false, { error: err.message });
    }
  });

  // ─────────────────────────────────────────────
  // SUBMIT SECRET
  // ─────────────────────────────────────────────
  socket.on('submit_secret', async ({ roomId, secret }, cb) => {
    if (!(await throttle("submit_secret"))) return reply(cb, false, { error: "rate_limited" });

    try {
      await setSecret(roomId, socket.id, secret);

      const state = await getRoom(roomId);
      io.to(roomId).emit('room_state', state);

      reply(cb, true);

    } catch (err: any) {
      console.error("submit_secret error:", err);
      reply(cb, false, { error: err.message });
    }
  });

  // ─────────────────────────────────────────────
  // MAKE GUESS
  // ─────────────────────────────────────────────
  socket.on('make_guess', async ({ roomId, guess }, cb) => {
    if (!(await throttle("make_guess"))) return reply(cb, false, { error: "rate_limited" });

    try {
      const result = await makeGuess(roomId, socket.id, guess);

      // Return full guess result to THIS socket only
      socket.emit('guess_result', {
        guess,
        hint: result.hint,
        attempts: result.attempts,
        solved: result.solved
      });

      // Notify opponent
      const room = await getRoom(roomId);
      if (!room) {
        reply(cb, false, { error: "room_missing_after_update" });
        return;
      }

      const opponentId = Object.keys(room.players).find(id => id !== socket.id);
      if (opponentId) {
        io.to(opponentId).emit('opponent_guessed_notification', {
          attemptsByOpponent: result.attempts,
          opponentSolved: result.solved
        });
      }

      // If both solved — broadcast endgame
      if (result.bothSolved) {
        const finalRoom = await getRoom(roomId);
        if (finalRoom) {
          const players = Object.values(finalRoom.players);

          // Winner logic
          let winnerId = players[0].id;

          if (players.length === 2) {
            if (players[1].attempts < players[0].attempts) {
              winnerId = players[1].id;
            } else if (players[1].attempts === players[0].attempts) {
              // earlier time wins
              winnerId =
                (players[0].finishedAt || 0) <= (players[1].finishedAt || 0)
                  ? players[0].id
                  : players[1].id;
            }
          }

          io.to(roomId).emit('game_over', {
            winnerId,
            players: finalRoom.players
          });
        }
      }

      reply(cb, true);

    } catch (err: any) {
      console.error("make_guess error:", err);
      reply(cb, false, { error: err.message });
    }
  });

  // ─────────────────────────────────────────────
  // GET ROOM STATE
  // ─────────────────────────────────────────────
  socket.on('get_room_state', async ({ roomId }, cb) => {
    if (!(await throttle("get_room_state"))) return reply(cb, false, { error: "rate_limited" });

    try {
      const room = await getRoom(roomId);
      reply(cb, true, { room });

    } catch (err: any) {
      console.error("get_room_state error:", err);
      reply(cb, false, { error: err.message });
    }
  });

}
