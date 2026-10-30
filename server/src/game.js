import { randomBytes } from 'node:crypto';
import { pickWords, scramble, splitUnits, isCorrect } from './words.js';

export const MAX_PLAYERS = 10;
export const LIMITS = { rounds: [1, 20], timer: [15, 120] };
export const DEFAULTS = { rounds: 5, timer: 30 };
const BETWEEN_ROUNDS_MS = 5000;
// Alone there is nobody to wait for, so the pause between words is shorter (and can be skipped).
const SOLO_BREAK_MS = 4500;
// How long a dropped player's seat is held, so a mistaken refresh or a network blip does not cost them the game.
const GRACE_MS = 45000;
const HINT_COST = { letter: 25, category: 10 };
const BASE_POINTS = 100;
const SPEED_POINTS = 100;
const MIN_POINTS = 20;

// No 0/O/1/I so a code read aloud over WhatsApp or from a grandparent's glasses is unambiguous.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const clamp = (n, [lo, hi], fallback) => (Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : fallback);
// Long enough for an autofilled full name; screens show a short form (see client/lib/names.mjs), so length is not a layout problem.
export const MAX_NAME_LENGTH = 30;
const cleanName = (name) => [...String(name ?? '').trim()].slice(0, MAX_NAME_LENGTH).join('').trim() || 'Player';
const cleanLang = (lang) => (lang === 'en' ? 'en' : 'hi');

export class GameManager {
  // coalesceAnswers: when several answers land in the same instant (ten players solving a word together), send ONE
  // room update after all of them instead of one each. Off by default so tests see updates immediately.
  constructor(io, { betweenRoundsMs = BETWEEN_ROUNDS_MS, soloBreakMs = SOLO_BREAK_MS, graceMs = GRACE_MS, now = Date.now, coalesceAnswers = false } = {}) {
    this.coalesceAnswers = coalesceAnswers;
    this.io = io;
    this.rooms = new Map();
    this.socketRoom = new Map();
    this.betweenRoundsMs = betweenRoundsMs;
    this.soloBreakMs = soloBreakMs;
    this.graceMs = graceMs;
    this.now = now;
  }

  breakMs(room) {
    return room.solo ? Math.min(this.betweenRoundsMs, this.soloBreakMs) : this.betweenRoundsMs;
  }

  notify(room, notice) {
    this.io.to(room.code).emit('room:notice', notice);
  }

  newCode() {
    for (;;) {
      const code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
      if (!this.rooms.has(code)) return code;
    }
  }

  createRoom(socket, { name, lang, solo = false, rounds, timer }) {
    const room = {
      code: this.newCode(),
      lang: cleanLang(lang),
      solo,
      hostId: socket.id,
      settings: { rounds: clamp(rounds, LIMITS.rounds, DEFAULTS.rounds), timer: clamp(timer, LIMITS.timer, DEFAULTS.timer) },
      phase: 'lobby',
      players: new Map(),
      words: [],
      playedWords: new Set(), // lives and dies with the room, so a new room starts fresh
      roundIdx: -1,
      round: null,
      lastResult: null,
      history: [], // one entry per finished round, for the end-of-game summary
      nextRoundAt: 0,
      timeout: null,
    };
    this.rooms.set(room.code, room);
    this.addPlayer(room, socket, name);
    return room;
  }

  addPlayer(room, socket, name) {
    room.players.set(socket.id, {
      id: socket.id,
      // Secret that lets this browser reclaim the seat after a refresh; never sent to other players.
      token: randomBytes(16).toString('hex'),
      name: cleanName(name),
      score: 0,
      solvedCount: 0, // words solved this game
      connected: true,
      away: false, // page hidden (switched app/tab) but connection alive; shown to others at once
      left: false,
      graceTimer: null,
    });
    this.socketRoom.set(socket.id, room.code);
    socket.join(room.code);
  }

  tokenOf(socket) {
    return this.roomOf(socket)?.players.get(socket.id)?.token;
  }

  roomOf(socket) {
    return this.rooms.get(this.socketRoom.get(socket.id));
  }

  joinRoom(socket, { code, name }) {
    const room = this.rooms.get(String(code ?? '').trim().toUpperCase());
    if (!room || room.solo) return { error: 'room_not_found' };
    if (room.phase !== 'lobby') return { error: 'game_in_progress' };
    if (room.players.size >= MAX_PLAYERS) return { error: 'room_full' };
    this.addPlayer(room, socket, name);
    this.broadcast(room);
    return { room };
  }

  setSettings(socket, { rounds, timer, lang }) {
    const room = this.roomOf(socket);
    if (!room || room.hostId !== socket.id || room.phase !== 'lobby') return;
    // Each tap sends only the option that changed; anything missing keeps its current value. (Sending the whole
    // set from a stale screen let a second quick tap silently undo the first.)
    room.settings = {
      rounds: clamp(rounds, LIMITS.rounds, room.settings.rounds),
      timer: clamp(timer, LIMITS.timer, room.settings.timer),
    };
    if (lang && cleanLang(lang) !== room.lang) {
      room.lang = cleanLang(lang);
      this.notify(room, { type: 'lang', lang: room.lang });
    }
    this.broadcast(room);
  }

  startGame(socket) {
    const room = this.roomOf(socket);
    if (!room || room.hostId !== socket.id || !['lobby', 'ended'].includes(room.phase)) return;
    for (const p of room.players.values()) {
      p.score = 0;
      p.solvedCount = 0;
    }
    room.history = [];
    const words = pickWords(room.lang, room.settings.rounds, Math.random, room.playedWords);
    // pickWords ignores the history when it can't fill the rounds with fresh words; start the history over then.
    if (words.some((w) => room.playedWords.has(w.word))) room.playedWords.clear();
    for (const w of words) room.playedWords.add(w.word);
    room.words = words;
    room.roundIdx = -1;
    this.nextRound(room);
  }

  // Rematch: send everyone back to the waiting room so the host can change settings before starting.
  // A solo player has no one to wait for, so that game restarts straight away, unless they asked for the
  // settings screen (toLobby).
  playAgain(socket, { toLobby = false } = {}) {
    const room = this.roomOf(socket);
    if (!room || room.hostId !== socket.id || room.phase !== 'ended') return;
    if (room.solo && !toLobby) return this.startGame(socket);
    // Players who are only mid-refresh keep their seat; only those who really left are dropped.
    for (const [id, p] of room.players) {
      if (p.left) room.players.delete(id);
      else {
        p.score = 0;
        p.solvedCount = 0;
      }
    }
    room.history = [];
    room.phase = 'lobby';
    room.words = [];
    room.roundIdx = -1;
    room.round = null;
    room.lastResult = null;
    this.broadcast(room);
  }

  nextRound(room) {
    room.roundIdx += 1;
    if (room.roundIdx >= room.words.length) return this.endGame(room);
    const target = room.words[room.roundIdx];
    const durationMs = room.settings.timer * 1000;
    const startedAt = this.now();
    const tiles = scramble(target.units);
    room.phase = 'round';
    room.round = {
      target,
      tiles,
      startedAt,
      endsAt: startedAt + durationMs,
      durationMs,
      solved: new Map(),
      hints: new Map(),
      meta: {
        round: room.roundIdx + 1,
        totalRounds: room.words.length,
        tiles,
        length: target.units.length,
        hasCategory: !!target.category,
      },
    };
    room.timeout = setTimeout(() => this.endRound(room), durationMs);
    this.broadcast(room);
    this.io.to(room.code).emit('round:start', { ...room.round.meta, durationMs, remainingMs: durationMs, endsAt: room.round.endsAt });
  }

  // `ack` (optional) is how the answer is confirmed to the player who sent it. It is called as soon as the score is
  // recorded, BEFORE the room is told, so the player never waits behind sending updates to everyone else.
  submitAnswer(socket, answer, ack) {
    const reply = (result) => {
      ack?.(result);
      return result;
    };
    const room = this.roomOf(socket);
    if (!room || room.phase !== 'round' || !Array.isArray(answer)) return reply({ correct: false });
    const { round } = room;
    if (round.solved.has(socket.id)) return reply({ correct: true });
    // An answer is always exactly as long as the word; reject anything else before doing any work on it.
    if (answer.length !== round.target.units.length) return reply({ correct: false });
    if (!isCorrect(room.lang, round.target, answer.map(String))) return reply({ correct: false });

    const elapsed = this.now() - round.startedAt;
    const remaining = Math.max(0, round.durationMs - elapsed) / round.durationMs;
    const hints = round.hints.get(socket.id) ?? {};
    const penalty = (hints.letter ? HINT_COST.letter : 0) + (hints.category ? HINT_COST.category : 0);
    const points = Math.max(MIN_POINTS, BASE_POINTS + Math.round(SPEED_POINTS * remaining) - penalty);
    const me = room.players.get(socket.id);
    me.score += points;
    me.solvedCount += 1;
    round.solved.set(socket.id, { points, timeMs: elapsed });
    const result = reply({ correct: true, points });
    this.broadcastSoon(room);
    this.endRoundIfAllSolved(room);
    return result;
  }

  requestHint(socket, type) {
    const room = this.roomOf(socket);
    if (!room || room.phase !== 'round' || !(type in HINT_COST)) return null;
    const { round } = room;
    const used = round.hints.get(socket.id) ?? {};
    round.hints.set(socket.id, { ...used, [type]: true });
    return { type, value: this.hintValue(round, type), cost: used[type] ? 0 : HINT_COST[type] };
  }

  hintValue(round, type) {
    return type === 'letter' ? round.target.units[0] : round.target.category;
  }

  // The round ends early once everyone who is still here has solved it; players mid-refresh do not hold it up.
  endRoundIfAllSolved(room) {
    if (room.phase !== 'round') return;
    const present = [...room.players.values()].filter((p) => p.connected);
    if (present.length && present.every((p) => room.round.solved.has(p.id))) this.endRound(room);
  }

  endRound(room) {
    if (room.phase !== 'round') return;
    clearTimeout(room.timeout);
    const { round } = room;
    room.phase = 'between';
    const results = [...room.players.values()]
      .map((p) => ({ id: p.id, name: p.name, solved: round.solved.has(p.id), ...(round.solved.get(p.id) ?? { points: 0, timeMs: null }) }))
      .sort((a, b) => (b.solved - a.solved) || ((a.timeMs ?? Infinity) - (b.timeMs ?? Infinity)));
    room.lastResult = {
      word: round.target.word,
      round: room.roundIdx + 1,
      totalRounds: room.words.length,
      results,
      leaderboard: this.leaderboard(room),
    };
    room.history.push({ word: round.target.word, round: room.roundIdx + 1, results: results.map(({ id, solved, points, timeMs }) => ({ id, solved, points, timeMs })) });
    const pause = this.breakMs(room);
    room.nextRoundAt = this.now() + pause;
    this.broadcast(room);
    this.io.to(room.code).emit('round:result', { ...room.lastResult, nextInMs: pause });
    room.timeout = setTimeout(() => this.nextRound(room), pause);
  }

  // Solo only: the player is done reading the result and wants the next word now.
  skipBreak(socket) {
    const room = this.roomOf(socket);
    if (!room || !room.solo || room.phase !== 'between') return;
    clearTimeout(room.timeout);
    this.nextRound(room);
  }

  endGame(room) {
    room.phase = 'ended';
    room.round = null;
    this.broadcast(room);
    this.io.to(room.code).emit('game:end', { leaderboard: this.leaderboard(room), history: room.history });
  }

  leaderboard(room) {
    return [...room.players.values()]
      .map(({ id, name, score, solvedCount, left }) => ({ id, name, score, solvedCount, left }))
      .sort((a, b) => b.score - a.score);
  }

  publicState(room) {
    return {
      code: room.code,
      lang: room.lang,
      solo: room.solo,
      hostId: room.hostId,
      settings: room.settings,
      phase: room.phase,
      players: [...room.players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        connected: p.connected,
        away: p.connected && p.away,
        solved: !!room.round?.solved.has(p.id),
        solvedCount: p.solvedCount,
        left: p.left,
      })),
    };
  }

  broadcast(room) {
    room.updateQueued = false; // this update carries everything a queued one would have
    this.io.to(room.code).emit('room:state', this.publicState(room));
  }

  // Like broadcast, but when many answers arrive in the same instant they share one update, sent right after the
  // current batch of incoming messages has been handled. Any ordinary broadcast in between replaces it.
  broadcastSoon(room) {
    if (!this.coalesceAnswers) return this.broadcast(room);
    if (room.updateQueued) return;
    room.updateQueued = true;
    setImmediate(() => {
      if (room.updateQueued && this.rooms.get(room.code) === room) this.broadcast(room);
    });
  }

  // --- presence: dropped connections, refreshes, and deliberate leaving ---

  // The player's page was hidden or shown again. A frozen background page cannot answer the server's pings, so
  // without this the others would only see them go offline up to ~45s later.
  setAway(socket, away) {
    const room = this.roomOf(socket);
    const player = room?.players.get(socket.id);
    if (!player || player.away === away) return;
    player.away = away;
    this.broadcast(room);
  }

  // Connection lost (refresh, closed tab, network blip). The seat is held for graceMs.
  disconnect(socket) {
    const room = this.roomOf(socket);
    this.socketRoom.delete(socket.id);
    const player = room?.players.get(socket.id);
    if (!player) return;
    player.connected = false;
    clearTimeout(player.graceTimer);
    player.graceTimer = setTimeout(() => this.finalizeLeave(room, player), this.graceMs);
    player.graceTimer.unref?.();
    this.presenceChanged(room);
  }

  // The player pressed Leave: no grace.
  leave(socket) {
    const room = this.roomOf(socket);
    this.socketRoom.delete(socket.id);
    const player = room?.players.get(socket.id);
    if (!player) return;
    socket.leave(room.code);
    this.finalizeLeave(room, player);
  }

  finalizeLeave(room, player) {
    clearTimeout(player.graceTimer);
    player.graceTimer = null;
    player.connected = false;
    player.left = true;
    player.token = null;
    if (room.phase === 'lobby') room.players.delete(player.id);

    if (!this.alive(room)) return this.destroy(room);
    let newHost = null;
    if (room.hostId === player.id) {
      newHost = [...room.players.values()].find((p) => !p.left && p.connected) ?? [...room.players.values()].find((p) => !p.left) ?? null;
      if (newHost) room.hostId = newHost.id;
    }
    // Everyone is told who left and, if it was the host, who runs the game now; without this a host leaving was silent.
    if (!room.solo) this.notify(room, { type: 'left', id: player.id, name: player.name, newHostId: newHost?.id, newHostName: newHost?.name });
    this.presenceChanged(room);
  }

  presenceChanged(room) {
    this.broadcast(room);
    this.endRoundIfAllSolved(room);
  }

  alive(room) {
    return [...room.players.values()].some((p) => p.connected || p.graceTimer);
  }

  destroy(room) {
    clearTimeout(room.timeout);
    for (const p of room.players.values()) clearTimeout(p.graceTimer);
    this.rooms.delete(room.code);
    for (const [socketId, code] of this.socketRoom) if (code === room.code) this.socketRoom.delete(socketId);
  }

  // A browser comes back with the token it was given: put it in its old seat and bring it up to date.
  resume(socket, { code, token }) {
    const room = this.rooms.get(String(code ?? '').trim().toUpperCase());
    const player = room && token ? [...room.players.values()].find((p) => p.token && p.token === token) : null;
    if (!player) return { error: 'resume_failed' };

    const oldId = player.id;
    if (oldId !== socket.id) {
      // Same player opened in a second tab: the newest tab takes the seat and the old one is told.
      this.io.sockets?.sockets?.get(oldId)?.leave?.(room.code);
      this.io.to(oldId).emit('session:taken');
      this.socketRoom.delete(oldId);
      this.rebind(room, oldId, socket.id);
    }
    clearTimeout(player.graceTimer);
    player.graceTimer = null;
    player.connected = true;
    player.away = false;
    this.socketRoom.set(socket.id, room.code);
    socket.join(room.code);

    this.broadcast(room);
    return { code: room.code, token: player.token, resume: this.sendSnapshot(room, socket, player) };
  }

  // The seat moves to a new socket id: everything keyed by the old id follows.
  rebind(room, oldId, newId) {
    room.players = new Map([...room.players].map(([id, p]) => [id === oldId ? newId : id, p]));
    room.players.get(newId).id = newId;
    if (room.hostId === oldId) room.hostId = newId;
    const { round, lastResult } = room;
    for (const map of [round?.solved, round?.hints]) {
      if (map?.has(oldId)) {
        map.set(newId, map.get(oldId));
        map.delete(oldId);
      }
    }
    if (lastResult) {
      for (const row of [...lastResult.results, ...lastResult.leaderboard]) if (row.id === oldId) row.id = newId;
    }
    for (const h of room.history) for (const row of h.results) if (row.id === oldId) row.id = newId;
  }

  // Re-send whatever the screen needs for the current phase, since a refreshed page has forgotten it all.
  sendSnapshot(room, socket, player) {
    if (room.phase === 'round') {
      const { round } = room;
      const mine = round.solved.get(player.id);
      const used = round.hints.get(player.id) ?? {};
      const hints = {};
      for (const type of Object.keys(HINT_COST)) if (used[type]) hints[type] = this.hintValue(round, type);
      // A solved player already saw the word, so their finished arrangement can be shown again.
      const resume = { solved: !!mine, points: mine?.points ?? 0, hints, answer: mine ? round.target.units : undefined };
      socket.emit('round:start', {
        ...round.meta,
        durationMs: round.durationMs,
        remainingMs: Math.max(0, round.endsAt - this.now()),
        endsAt: round.endsAt,
        resume,
      });
      return resume;
    }
    if (room.phase === 'between' && room.lastResult) {
      socket.emit('round:result', { ...room.lastResult, nextInMs: Math.max(0, room.nextRoundAt - this.now()) });
    } else if (room.phase === 'ended') {
      socket.emit('game:end', { leaderboard: this.leaderboard(room), history: room.history });
    }
    return null;
  }
}

export { splitUnits };
