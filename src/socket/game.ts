import { randomUUID } from 'crypto';
import { redis, getRoom, saveRoom } from '../services/redisClient';
import { valid4UniqueDigits } from '../utils/validate';

/**
 * Compute hint:
 * Green  = digit correct + position correct
 * Orange = digit correct + position wrong
 */
function computeHint(secret: string, guess: string): [number, number] {
  let greens = 0;
  let oranges = 0;

  const usedSecret = [false, false, false, false];
  const usedGuess = [false, false, false, false];

  // Green check
  for (let i = 0; i < 4; i++) {
    if (guess[i] === secret[i]) {
      greens++;
      usedSecret[i] = true;
      usedGuess[i] = true;
    }
  }

  // Orange check
  for (let i = 0; i < 4; i++) {
    if (usedGuess[i]) continue;
    for (let j = 0; j < 4; j++) {
      if (usedSecret[j]) continue;
      if (guess[i] === secret[j]) {
        oranges++;
        usedGuess[i] = true;
        usedSecret[j] = true;
        break;
      }
    }
  }

  return [greens, oranges];
}

/**
 * Create new room skeleton
 */
export async function createRoomSkeleton(name: string) {
  const id = randomUUID().slice(0, 8);

  const room = {
    id,
    players: {},
    createdAt: Date.now(),
    finished: false,
  };

  await saveRoom(id, room);
  return room;
}

/**
 * Add player to room
 */
export async function addPlayer(roomId: string, playerId: string, name: string) {
  const room = await getRoom(roomId);

  if (!room) throw new Error('room_not_found');
  if (Object.keys(room.players).length >= 2) throw new Error('room_full');

  // Prevent accidental overwrite if multiple servers add same player
  if (room.players[playerId]) {
    return room; // already added → safe no-op
  }

  room.players[playerId] = {
    id: playerId,
    name,
    secret: null,
    attempts: 0,
    solved: false,
    finishedAt: null,
    history: [],
  };

  await saveRoom(roomId, room);
  return room;
}

/**
 * Player submits secret number
 */
export async function setSecret(roomId: string, playerId: string, secret: string) {
  if (!valid4UniqueDigits(secret)) throw new Error('invalid_secret');

  const room = await getRoom(roomId);
  if (!room) throw new Error('room_not_found');

  const player = room.players[playerId];
  if (!player) throw new Error('not_in_room');

  // Prevent changing secret once set
  if (player.secret !== null) throw new Error('secret_already_set');

  player.secret = secret;

  await saveRoom(roomId, room);
  return room;
}

/**
 * Player makes a guess against opponent
 */
export async function makeGuess(roomId: string, playerId: string, guess: string) {
  if (!valid4UniqueDigits(guess)) throw new Error('invalid_guess');

  const room = await getRoom(roomId);
  if (!room) throw new Error('room_not_found');

  const player = room.players[playerId];
  if (!player) throw new Error('not_in_room');

  const opponentId = Object.keys(room.players).find(id => id !== playerId);
  if (!opponentId) throw new Error('no_opponent');

  const opponent = room.players[opponentId];

  // Opponent must have submitted secret first
  if (!opponent.secret) throw new Error('opponent_secret_missing');

  // Prevent guesses after game ended
  if (room.finished) throw new Error('game_already_finished');

  // Increase attempt count
  player.attempts++;

  // Compute hint
  const hint = computeHint(opponent.secret, guess);

  // Store attempt history
  player.history.push({
    guess,
    hint,
    at: Date.now(),
  });

  // Check if solved
  if (hint[0] === 4) {
    player.solved = true;
    player.finishedAt = Date.now();
  }

  // Determine if both solved
  const bothSolved = Object.values(room.players).every(
    (p: any) => p.secret && p.solved === true
  );

  if (bothSolved) {
    room.finished = true;
  }

  await saveRoom(roomId, room);

  return {
    hint,
    solved: player.solved,
    attempts: player.attempts,
    bothSolved,
  };
}
