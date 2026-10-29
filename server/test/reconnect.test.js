import test from 'node:test';
import assert from 'node:assert/strict';
import { GameManager } from '../src/game.js';

function fakeIo() {
  const events = [];
  return { events, to: (room) => ({ emit: (name, data) => events.push({ room, name, data }) }) };
}
function fakeSocket(id) {
  const sent = [];
  return { id, sent, join() {}, leave() {}, emit(name, data) { sent.push({ name, data }); } };
}
const lastSent = (socket, name) => socket.sent.filter((e) => e.name === name).at(-1)?.data;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function twoPlayerGame(opts = {}) {
  const io = fakeIo();
  const games = new GameManager(io, { betweenRoundsMs: 10_000, graceMs: 40, ...opts });
  const a = fakeSocket('a');
  const b = fakeSocket('b');
  const room = games.createRoom(a, { name: 'Asha', lang: 'en', rounds: 3 });
  games.joinRoom(b, { code: room.code, name: 'Bunty' });
  return { io, games, a, b, room, tokenA: games.tokenOf(a), tokenB: games.tokenOf(b) };
}

test('tokens are private: not part of the public room state', () => {
  const { games, room, tokenA } = twoPlayerGame();
  assert.match(tokenA, /^[0-9a-f]{32}$/);
  assert.ok(!JSON.stringify(games.publicState(room)).includes(tokenA));
  games.destroy(room);
});

test('refresh mid-round: seat, score, solved state and hints come back', () => {
  const { games, a, b, room, tokenA, tokenB } = twoPlayerGame();
  games.startGame(a);
  const answer = room.round.target.units;
  games.requestHint(b, 'letter');
  const points = games.submitAnswer(b, answer).points;
  games.disconnect(b);
  games.disconnect(a);

  const b2 = fakeSocket('b2');
  const res = games.resume(b2, { code: room.code, token: tokenB });
  assert.equal(res.error, undefined);
  assert.equal(res.resume.solved, true);
  assert.equal(res.resume.points, points);
  assert.equal(res.resume.hints.letter, answer[0]);
  assert.equal(room.players.get('b2').score, points);
  assert.equal(room.players.get('b2').connected, true);

  const snapshot = lastSent(b2, 'round:start');
  assert.equal(snapshot.tiles.join(''), room.round.tiles.join(''));
  assert.ok(snapshot.remainingMs <= snapshot.durationMs);

  const a2 = fakeSocket('a2');
  games.resume(a2, { code: room.code, token: tokenA });
  assert.equal(room.hostId, 'a2', 'host role follows the new connection');
  clearTimeout(room.timeout);
  games.destroy(room);
});

test('a player mid-refresh does not stop the others finishing the round early', () => {
  const { games, a, b, room } = twoPlayerGame();
  games.startGame(a);
  games.disconnect(b);
  games.submitAnswer(a, room.round.target.units);
  assert.equal(room.phase, 'between');
  clearTimeout(room.timeout);
  games.destroy(room);
});

test('host refresh: seat held during grace, handed over only if they never return', async () => {
  const { games, a, room, tokenA } = twoPlayerGame({ graceMs: 30 });
  games.startGame(a);
  clearTimeout(room.timeout);
  games.disconnect(a);
  assert.equal(room.hostId, 'a', 'host seat held during grace');
  await wait(70);
  assert.equal(room.hostId, 'b', 'handed over after grace expired');
  assert.equal(games.resume(fakeSocket('a2'), { code: room.code, token: tokenA }).error, 'resume_failed');
  games.destroy(room);
});

test('host returns within grace and keeps host controls', () => {
  const { games, a, room, tokenA } = twoPlayerGame();
  games.disconnect(a);
  const a2 = fakeSocket('a2');
  games.resume(a2, { code: room.code, token: tokenA });
  assert.equal(room.hostId, 'a2');
  games.setSettings(a2, { rounds: 7, timer: 40 });
  assert.deepEqual(room.settings, { rounds: 7, timer: 40 });
  games.startGame(a2);
  assert.equal(room.phase, 'round');
  clearTimeout(room.timeout);
  games.destroy(room);
});

test('lobby refresh: seat is kept during grace and freed after', async () => {
  const { games, b, room, tokenB } = twoPlayerGame({ graceMs: 30 });
  games.disconnect(b);
  assert.equal(room.players.size, 2);
  const b2 = fakeSocket('b2');
  assert.equal(games.resume(b2, { code: room.code, token: tokenB }).code, room.code);
  assert.equal(room.players.size, 2);

  games.disconnect(b2);
  await wait(70);
  assert.equal(room.players.size, 1, 'seat freed after grace in the lobby');
  games.destroy(room);
});

test('solo refresh resumes the same round; walking away destroys the room', async () => {
  const games = new GameManager(fakeIo(), { betweenRoundsMs: 10_000, graceMs: 30 });
  const s = fakeSocket('s1');
  const room = games.createRoom(s, { name: 'Solo', lang: 'hi', solo: true, rounds: 3 });
  const token = games.tokenOf(s);
  games.startGame(s);
  const word = room.round.target.word;

  games.disconnect(s);
  assert.ok(games.rooms.has(room.code), 'room survives the refresh');
  const s2 = fakeSocket('s2');
  const res = games.resume(s2, { code: room.code, token });
  assert.equal(room.round.target.word, word);
  assert.equal(res.resume.solved, false);
  assert.equal(lastSent(s2, 'round:start').round, 1);

  games.disconnect(s2);
  await wait(70);
  assert.ok(!games.rooms.has(room.code), 'room is destroyed when nobody comes back');
});

test('resume re-sends the right screen for each phase', () => {
  const { games, a, b, room, tokenA } = twoPlayerGame();
  games.startGame(a);
  games.submitAnswer(a, room.round.target.units);
  games.submitAnswer(b, room.round.target.units);
  assert.equal(room.phase, 'between');

  games.disconnect(a);
  const a2 = fakeSocket('a2');
  games.resume(a2, { code: room.code, token: tokenA });
  const result = lastSent(a2, 'round:result');
  assert.equal(result.word, room.words[0].word);
  assert.ok(result.results.some((r) => r.id === 'a2'), 'ids in the re-sent result point at the new connection');
  assert.ok(result.nextInMs > 0);

  clearTimeout(room.timeout);
  games.endGame(room);
  games.disconnect(a2);
  const a3 = fakeSocket('a3');
  games.resume(a3, { code: room.code, token: tokenA });
  assert.equal(lastSent(a3, 'game:end').leaderboard.length, 2);
  games.destroy(room);
});

test('wrong token, wrong code, missing token and a token after Leave are all refused', () => {
  const { games, b, room, tokenA, tokenB } = twoPlayerGame();
  assert.equal(games.resume(fakeSocket('x'), { code: room.code, token: 'nope' }).error, 'resume_failed');
  assert.equal(games.resume(fakeSocket('x'), { code: 'ZZZZ', token: tokenA }).error, 'resume_failed');
  assert.equal(games.resume(fakeSocket('x'), { code: room.code }).error, 'resume_failed');
  games.leave(b);
  assert.equal(games.resume(fakeSocket('b2'), { code: room.code, token: tokenB }).error, 'resume_failed');
  games.destroy(room);
});

test('same player in a second tab: newest tab takes the seat and the old one is told', () => {
  const { io, games, b, room, tokenB } = twoPlayerGame();
  const b2 = fakeSocket('b2');
  games.resume(b2, { code: room.code, token: tokenB });
  assert.ok(io.events.some((e) => e.name === 'session:taken' && e.room === 'b'));
  assert.equal(room.players.size, 2);
  games.disconnect(b);
  assert.equal(room.players.get('b2').connected, true, 'old tab closing must not drop the new tab');
  games.destroy(room);
});

test('rematch keeps a player who is mid-refresh', () => {
  const { games, a, b, room } = twoPlayerGame();
  games.startGame(a);
  clearTimeout(room.timeout);
  games.endGame(room);
  games.disconnect(b);
  games.playAgain(a);
  assert.equal(room.phase, 'lobby');
  assert.equal(room.players.size, 2);
  games.destroy(room);
});

test('explicit Leave has no grace period', () => {
  const { games, a, b, room } = twoPlayerGame();
  games.leave(b);
  assert.equal(room.players.size, 1);
  games.leave(a);
  assert.ok(!games.rooms.has(room.code));
});

test('away: a hidden page is shown as away to everyone at once, and clears when it is back', () => {
  const { io, games, a, b, room } = twoPlayerGame();
  const stateOf = (name) => io.events.filter((e) => e.name === 'room:state').at(-1).data.players.find((p) => p.name === name);

  games.setAway(b, true);
  assert.equal(stateOf('Bunty').away, true);
  assert.equal(stateOf('Bunty').connected, true, 'away is not offline');
  assert.equal(stateOf('Asha').away, false);

  games.setAway(b, false);
  assert.equal(stateOf('Bunty').away, false);
  games.destroy(room);
});

test('away: setting the same value again sends nothing, and an unknown socket is ignored', () => {
  const { io, games, b, room } = twoPlayerGame();
  games.setAway(b, true);
  const before = io.events.length;
  games.setAway(b, true);
  games.setAway(fakeSocket('stranger'), true);
  assert.equal(io.events.length, before);
  games.destroy(room);
});

test('away: a player who drops while away shows as offline, and resuming clears away', () => {
  const { io, games, b, room, tokenB } = twoPlayerGame();
  games.setAway(b, true);
  games.disconnect(b);
  const dropped = io.events.filter((e) => e.name === 'room:state').at(-1).data.players.find((p) => p.name === 'Bunty');
  assert.equal(dropped.connected, false);
  assert.equal(dropped.away, false, 'offline takes over from away');

  games.resume(fakeSocket('b2'), { code: room.code, token: tokenB });
  const back = io.events.filter((e) => e.name === 'room:state').at(-1).data.players.find((p) => p.name === 'Bunty');
  assert.equal(back.connected, true);
  assert.equal(back.away, false);
  games.destroy(room);
});

test('away does not hold up a round or change who is counted as present', () => {
  const { games, a, b, room } = twoPlayerGame();
  games.startGame(a);
  games.setAway(b, true);
  games.submitAnswer(a, room.round.target.units);
  assert.equal(room.phase, 'round', 'an away player is still in the round');
  games.submitAnswer(b, room.round.target.units);
  assert.equal(room.phase, 'between');
  clearTimeout(room.timeout);
  games.destroy(room);
});
