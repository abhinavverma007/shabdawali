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
const eventsOf = (io, name) => io.events.filter((e) => e.name === name).map((e) => e.data);

function lobbyOf(n, opts = {}) {
  const io = fakeIo();
  const games = new GameManager(io, { betweenRoundsMs: 10_000, soloBreakMs: 10_000, graceMs: 50, ...opts });
  const sockets = Array.from({ length: n }, (_, i) => fakeSocket(`s${i}`));
  const room = games.createRoom(sockets[0], { name: 'Host Person', lang: 'hi', rounds: 3 });
  for (let i = 1; i < n; i++) games.joinRoom(sockets[i], { code: room.code, name: `Guest ${i}` });
  return { io, games, sockets, room };
}
function soloOf(opts = {}) {
  const io = fakeIo();
  const games = new GameManager(io, { betweenRoundsMs: 5000, soloBreakMs: 3000, ...opts });
  const s = fakeSocket('solo');
  const room = games.createRoom(s, { name: 'Rahul', lang: 'hi', solo: true, rounds: 3, timer: 30 });
  return { io, games, s, room };
}
const solve = (games, s, room) => games.submitAnswer(s, room.round.target.units);

// ---- multiplayer: settings -------------------------------------------------------------------------------------

test('settings: two quick taps (each sending only its own option) both stick', () => {
  const { games, sockets, room } = lobbyOf(2);
  games.setSettings(sockets[0], { rounds: 3 });
  games.setSettings(sockets[0], { timer: 20 }); // the screen had not caught up with the first tap yet
  assert.deepEqual(room.settings, { rounds: 3, timer: 20 });
  games.destroy(room);
});

test('settings: changing the language alone leaves rounds and timer untouched', () => {
  const { games, sockets, room } = lobbyOf(2);
  games.setSettings(sockets[0], { rounds: 8, timer: 45 });
  games.setSettings(sockets[0], { lang: 'en' });
  assert.deepEqual(room.settings, { rounds: 8, timer: 45 });
  assert.equal(room.lang, 'en');
  games.destroy(room);
});

test('settings: junk values are ignored and the old ones kept; only the host may change anything', () => {
  const { games, sockets, room } = lobbyOf(2);
  games.setSettings(sockets[0], { rounds: 'many', timer: null });
  assert.deepEqual(room.settings, { rounds: 3, timer: 30 });
  games.setSettings(sockets[1], { rounds: 10 });
  assert.equal(room.settings.rounds, 3);
  games.destroy(room);
});

test('language change tells the room once, and says nothing when the language did not change', () => {
  const { io, games, sockets, room } = lobbyOf(3);
  games.setSettings(sockets[0], { lang: 'en' });
  games.setSettings(sockets[0], { lang: 'en' });
  games.setSettings(sockets[0], { rounds: 5 });
  assert.deepEqual(eventsOf(io, 'room:notice'), [{ type: 'lang', lang: 'en' }]);
  games.setSettings(sockets[0], { lang: 'hi' });
  assert.equal(eventsOf(io, 'room:notice').length, 2);
  games.destroy(room);
});

// ---- multiplayer: someone leaves -------------------------------------------------------------------------------

test('host leaving mid-game: everyone is told who left and who runs the game now; the host is marked as left', () => {
  const { io, games, sockets, room } = lobbyOf(3);
  games.startGame(sockets[0]);
  clearTimeout(room.timeout);
  games.leave(sockets[0]);
  const [notice] = eventsOf(io, 'room:notice');
  assert.equal(notice.type, 'left');
  assert.equal(notice.name, 'Host Person');
  assert.equal(notice.newHostId, 's1');
  assert.equal(notice.newHostName, 'Guest 1');
  const state = io.events.filter((e) => e.name === 'room:state').at(-1).data;
  assert.equal(state.players.find((p) => p.id === 's0').left, true);
  assert.equal(state.players.find((p) => p.id === 's1').left, false);
  assert.equal(state.hostId, 's1');
  games.destroy(room);
});

test('a guest leaving is announced without a host change', () => {
  const { io, games, sockets, room } = lobbyOf(3);
  games.leave(sockets[2]);
  const [notice] = eventsOf(io, 'room:notice');
  assert.equal(notice.name, 'Guest 2');
  assert.equal(notice.newHostId, undefined);
  games.destroy(room);
});

test('a dropped connection that never comes back is announced when the seat is released', async () => {
  const { io, games, sockets, room } = lobbyOf(3, { graceMs: 30 });
  games.disconnect(sockets[2]);
  assert.equal(eventsOf(io, 'room:notice').length, 0, 'nothing is said while the seat is held');
  await new Promise((r) => setTimeout(r, 80));
  assert.equal(eventsOf(io, 'room:notice')[0].name, 'Guest 2');
  games.destroy(room);
});

test('solo: leaving says nothing to anyone', () => {
  const { io, games, s, room } = soloOf();
  games.leave(s);
  assert.equal(eventsOf(io, 'room:notice').length, 0);
  assert.ok(!games.rooms.has(room.code));
});

test('the final leaderboard marks players who left, and carries what the summary needs', () => {
  const { io, games, sockets, room } = lobbyOf(3);
  games.startGame(sockets[0]);
  solve(games, sockets[1], room);
  games.leave(sockets[0]);
  clearTimeout(room.timeout);
  games.endGame(room);
  const { leaderboard } = eventsOf(io, 'game:end').at(-1);
  const host = leaderboard.find((p) => p.id === 's0');
  const guest = leaderboard.find((p) => p.id === 's1');
  assert.equal(host.left, true);
  assert.equal(guest.left, false);
  assert.equal(guest.solvedCount, 1);
  games.destroy(room);
});

// ---- history and counts ----------------------------------------------------------------------------------------

test('every finished round is recorded for the end-of-game summary, and a new game starts it afresh', () => {
  const { io, games, s, room } = soloOf({ betweenRoundsMs: 10, soloBreakMs: 10 });
  games.startGame(s);
  const first = room.round.target.word;
  solve(games, s, room); // round ends at once (only player)
  assert.equal(room.history.length, 1);
  assert.equal(room.history[0].word, first);
  assert.equal(room.history[0].results[0].solved, true);
  assert.ok(room.history[0].results[0].points >= 100);
  clearTimeout(room.timeout);
  games.nextRound(room);
  games.endRound(room); // second round: nobody solved it
  assert.equal(room.history.length, 2);
  assert.equal(room.history[1].results[0].solved, false);
  clearTimeout(room.timeout);
  games.endGame(room);
  assert.equal(eventsOf(io, 'game:end').at(-1).history.length, 2);
  assert.equal(room.players.get('solo').solvedCount, 1);

  games.playAgain(s);
  assert.equal(room.history.length, 0, 'history restarts with the new game');
  assert.equal(room.players.get('solo').solvedCount, 0);
  clearTimeout(room.timeout);
  games.destroy(room);
});

test('history ids follow a player who refreshed (new connection id)', () => {
  const { games, sockets, room } = lobbyOf(2, { betweenRoundsMs: 10_000 });
  const token = games.tokenOf(sockets[1]);
  games.startGame(sockets[0]);
  solve(games, sockets[1], room);
  solve(games, sockets[0], room);
  assert.equal(room.history.length, 1);
  clearTimeout(room.timeout);
  games.disconnect(sockets[1]);
  const back = fakeSocket('s1-new');
  games.resume(back, { code: room.code, token });
  assert.ok(room.history[0].results.some((r) => r.id === 's1-new'));
  assert.ok(!room.history[0].results.some((r) => r.id === 's1'));
  games.destroy(room);
});

// ---- solo: shorter break, skipping, settings ------------------------------------------------------------------

test('solo pauses for less time between words than a group does', () => {
  const solo = soloOf();
  solo.games.startGame(solo.s);
  solve(solo.games, solo.s, solo.room);
  assert.equal(eventsOf(solo.io, 'round:result').at(-1).nextInMs, 3000);
  clearTimeout(solo.room.timeout);
  solo.games.destroy(solo.room);

  const group = lobbyOf(2, { betweenRoundsMs: 5000, soloBreakMs: 3000 });
  group.games.startGame(group.sockets[0]);
  group.games.endRound(group.room);
  assert.equal(eventsOf(group.io, 'round:result').at(-1).nextInMs, 5000);
  clearTimeout(group.room.timeout);
  group.games.destroy(group.room);
});

test('solo can skip the pause and go straight to the next word; groups cannot', () => {
  const solo = soloOf();
  solo.games.startGame(solo.s);
  solve(solo.games, solo.s, solo.room);
  assert.equal(solo.room.phase, 'between');
  solo.games.skipBreak(solo.s);
  assert.equal(solo.room.phase, 'round');
  assert.equal(solo.room.roundIdx, 1);
  solo.games.skipBreak(solo.s); // not between rounds any more: ignored
  assert.equal(solo.room.roundIdx, 1);
  clearTimeout(solo.room.timeout);
  solo.games.destroy(solo.room);

  const group = lobbyOf(2);
  group.games.startGame(group.sockets[0]);
  group.games.endRound(group.room);
  group.games.skipBreak(group.sockets[0]);
  assert.equal(group.room.phase, 'between', 'a group is not hurried along by one player');
  clearTimeout(group.room.timeout);
  group.games.destroy(group.room);
});

test('skipping the last pause finishes the game instead of hanging', () => {
  const { io, games, s, room } = soloOf();
  room.settings.rounds = 1;
  games.startGame(s);
  solve(games, s, room);
  games.skipBreak(s);
  assert.equal(room.phase, 'ended');
  assert.equal(eventsOf(io, 'game:end').length, 1);
  games.destroy(room);
});

test('solo: after a game the player can reopen the settings, change them, and start again', () => {
  const { games, s, room } = soloOf({ betweenRoundsMs: 10, soloBreakMs: 10 });
  room.settings.rounds = 1;
  games.startGame(s);
  solve(games, s, room);
  clearTimeout(room.timeout);
  games.nextRound(room);
  assert.equal(room.phase, 'ended');

  games.playAgain(s, { toLobby: true });
  assert.equal(room.phase, 'lobby');
  games.setSettings(s, { rounds: 2, timer: 60, lang: 'en' });
  assert.deepEqual(room.settings, { rounds: 2, timer: 60 });
  assert.equal(room.lang, 'en');
  games.startGame(s);
  assert.equal(room.phase, 'round');
  assert.equal(room.words.length, 2);
  assert.equal(room.round.durationMs, 60_000);
  clearTimeout(room.timeout);
  games.destroy(room);
});

test('solo: plain Play Again still restarts at once with the same settings', () => {
  const { games, s, room } = soloOf({ betweenRoundsMs: 10, soloBreakMs: 10 });
  room.settings.rounds = 1;
  games.startGame(s);
  solve(games, s, room);
  clearTimeout(room.timeout);
  games.nextRound(room);
  games.playAgain(s);
  assert.equal(room.phase, 'round');
  clearTimeout(room.timeout);
  games.destroy(room);
});
