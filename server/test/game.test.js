import test from 'node:test';
import assert from 'node:assert/strict';
import { splitUnits, pools, scramble, pickWords, isCorrect } from '../src/words.js';
import { GameManager, MAX_PLAYERS } from '../src/game.js';

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
const last = (io, name) => io.events.filter((e) => e.name === name).at(-1)?.data;

test('Devanagari words split into aksharas, not code points', () => {
  assert.deepEqual(splitUnits('अनार', 'hi'), ['अ', 'ना', 'र']);
  assert.deepEqual(splitUnits('कुर्सी', 'hi'), ['कु', 'र्सी']);
  assert.deepEqual(splitUnits('बैंगनी', 'hi'), ['बैं', 'ग', 'नी']);
  assert.deepEqual(splitUnits('स्कूल', 'hi'), ['स्कू', 'ल']);
});

test('every pooled word is 3-8 tiles and scrambles to a different order', () => {
  for (const lang of ['hi', 'en']) {
    assert.ok(pools[lang].all.length > 50);
    for (const { units } of pools[lang].all) {
      assert.ok(units.length >= 3 && units.length <= 8);
      const s = scramble(units);
      assert.deepEqual([...s].sort(), [...units].sort());
      if (new Set(units).size > 1) assert.notDeepEqual(s, units);
    }
  }
});

test('pickWords gives unique words and ramps difficulty', () => {
  const picks = pickWords('en', 5);
  assert.equal(new Set(picks.map((p) => p.word)).size, 5);
  assert.ok(picks[0].units.length <= picks[4].units.length);
});

test('anagram of another pool word is accepted', () => {
  const target = { word: 'STAR', units: [...'STAR'] };
  assert.ok(isCorrect('en', target, [...'STAR']));
  assert.ok(!isCorrect('en', target, [...'RATS']));
});

function startSolo({ timer = 30, now } = {}) {
  const io = fakeIo();
  const games = new GameManager(io, { betweenRoundsMs: 10, now });
  const s = fakeSocket('a');
  games.createRoom(s, { name: 'Asha', lang: 'en', solo: true, rounds: 2, timer });
  games.startGame(s);
  return { io, games, s, room: games.roomOf(s) };
}

test('solo: correct answer scores, ends round, then game ends after last round', async () => {
  const { io, games, s, room } = startSolo();
  const start = last(io, 'round:start');
  assert.equal(start.totalRounds, 2);
  assert.notEqual(start.tiles.join(''), room.round.target.word.toUpperCase());

  assert.equal(games.submitAnswer(s, ['X', 'X', 'X']).correct, false);
  const res = games.submitAnswer(s, room.round.target.units);
  assert.equal(res.correct, true);
  assert.ok(res.points >= 100);
  assert.equal(last(io, 'round:result').word, room.round.target.word);

  await new Promise((r) => setTimeout(r, 30));
  assert.equal(games.roomOf(s).phase, 'round');
  games.submitAnswer(s, games.roomOf(s).round.target.units);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(last(io, 'game:end').leaderboard[0].name, 'Asha');
  games.leave(s);
});

test('speed matters: later answers score less; hints cost points', () => {
  let t = 1000;
  const { games, s, room } = startSolo({ timer: 30, now: () => t });
  t += 1000;
  const fast = games.submitAnswer(s, room.round.target.units).points;

  const second = startSolo({ timer: 30, now: () => t });
  t += 25000;
  const slowRes = second.games.submitAnswer(second.s, second.room.round.target.units); const slow = slowRes.points;
  assert.ok(fast > slow, `fast=${fast} slow=${slow}`);

  const third = startSolo({ timer: 30, now: () => t });
  assert.equal(games.requestHint(s, 'letter')?.value, undefined); // wrong phase after solve is not an error
  const h = third.games.requestHint(third.s, 'letter');
  assert.equal(h.value, third.room.round.target.units[0]);
  const withHint = third.games.submitAnswer(third.s, third.room.round.target.units).points;
  assert.ok(withHint < 100 + 100);
  for (const g of [games, second.games, third.games]) clearTimeout(g.rooms.values().next().value?.timeout);
});

test('multiplayer: join, capacity, host-only start, no late join', () => {
  const io = fakeIo();
  const games = new GameManager(io, { betweenRoundsMs: 10 });
  const host = fakeSocket('h');
  const room = games.createRoom(host, { name: 'Host', lang: 'hi' });
  assert.match(room.code, /^[A-HJ-NP-Z2-9]{4}$/);

  for (let i = 1; i < MAX_PLAYERS; i++) assert.ok(games.joinRoom(fakeSocket(`p${i}`), { code: room.code.toLowerCase(), name: `P${i}` }).room);
  assert.equal(games.joinRoom(fakeSocket('x'), { code: room.code, name: 'X' }).error, 'room_full');
  assert.equal(games.joinRoom(fakeSocket('y'), { code: 'ZZZZ', name: 'Y' }).error, 'room_not_found');

  games.startGame(fakeSocket('p1'));
  assert.equal(room.phase, 'lobby');
  games.startGame(host);
  assert.equal(room.phase, 'round');
  clearTimeout(room.timeout);
  games.leave(host);
  assert.equal(games.joinRoom(fakeSocket('late'), { code: room.code, name: 'L' }).error, 'game_in_progress');
  assert.equal(room.hostId, 'p1');
});

test('play again returns the room to the lobby with scores reset and leavers dropped', () => {
  const io = fakeIo();
  const games = new GameManager(io, { betweenRoundsMs: 10 });
  const a = fakeSocket('a'), b = fakeSocket('b'), c = fakeSocket('c');
  const room = games.createRoom(a, { name: 'A', lang: 'en', rounds: 1 });
  games.joinRoom(b, { code: room.code, name: 'B' });
  games.joinRoom(c, { code: room.code, name: 'C' });
  games.startGame(a);
  games.submitAnswer(a, room.round.target.units);
  games.leave(c);
  games.endRound(room);
  clearTimeout(room.timeout);
  games.endGame(room);

  games.playAgain(b);
  assert.equal(room.phase, 'ended', 'only the host can trigger a rematch');
  games.playAgain(a);
  assert.equal(room.phase, 'lobby');
  assert.deepEqual([...room.players.values()].map((p) => [p.name, p.score]), [['A', 0], ['B', 0]]);
  games.setSettings(a, { rounds: 3, timer: 45 });
  assert.deepEqual(room.settings, { rounds: 3, timer: 45 });
  games.startGame(a);
  assert.equal(room.phase, 'round');
  clearTimeout(room.timeout);
});

test('a room never repeats a word across rematches while fresh words remain', () => {
  const games = new GameManager(fakeIo(), { betweenRoundsMs: 10 });
  const a = fakeSocket('a');
  const room = games.createRoom(a, { name: 'A', lang: 'en', rounds: 10 });
  const seen = new Set();
  const total = pools.en.all.length;
  for (let game = 0; game < Math.floor(total / 10); game++) {
    games.startGame(a);
    for (const w of room.words) {
      assert.ok(!seen.has(w.word), `${w.word} repeated in game ${game + 1}`);
      seen.add(w.word);
    }
    clearTimeout(room.timeout);
    games.endGame(room);
    games.playAgain(a);
  }
});

test('when the pool is used up the history resets instead of failing', () => {
  const games = new GameManager(fakeIo(), { betweenRoundsMs: 10 });
  const a = fakeSocket('a');
  const room = games.createRoom(a, { name: 'A', lang: 'en', rounds: 20 });
  const total = pools.en.all.length;
  for (let i = 0; i < Math.ceil(total / 20) + 1; i++) {
    games.startGame(a);
    assert.equal(room.words.length, 20);
    assert.equal(new Set(room.words.map((w) => w.word)).size, 20);
    clearTimeout(room.timeout);
    games.endGame(room);
    games.playAgain(a);
  }
});

test('a new room starts with no word history', () => {
  const games = new GameManager(fakeIo(), { betweenRoundsMs: 10 });
  const a = fakeSocket('a'), b = fakeSocket('b');
  const first = games.createRoom(a, { name: 'A', lang: 'en', rounds: 5 });
  games.startGame(a);
  clearTimeout(first.timeout);
  assert.equal(first.playedWords.size, 5);
  games.leave(a);
  const second = games.createRoom(b, { name: 'B', lang: 'en', rounds: 5 });
  assert.equal(second.playedWords.size, 0);
});

test('solo play again restarts immediately', () => {
  const { games, s, room } = startSolo();
  clearTimeout(room.timeout);
  games.endGame(room);
  games.playAgain(s);
  assert.equal(room.phase, 'round');
  clearTimeout(room.timeout);
});

test('round ends when every connected player has solved it', () => {
  const io = fakeIo();
  const games = new GameManager(io, { betweenRoundsMs: 10_000 });
  const a = fakeSocket('a'), b = fakeSocket('b');
  const room = games.createRoom(a, { name: 'A', lang: 'en', rounds: 2 });
  games.joinRoom(b, { code: room.code, name: 'B' });
  games.startGame(a);
  games.submitAnswer(a, room.round.target.units);
  assert.equal(room.phase, 'round');
  games.submitAnswer(b, room.round.target.units);
  assert.equal(room.phase, 'between');
  clearTimeout(room.timeout);
});

test('an answer of the wrong length is rejected without scoring', () => {
  const { games, s, room } = startSolo();
  assert.equal(games.submitAnswer(s, [...room.round.target.units, 'X']).correct, false);
  assert.equal(games.submitAnswer(s, room.round.target.units.slice(1)).correct, false);
  assert.equal(games.submitAnswer(s, new Array(5000).fill('A')).correct, false);
  assert.equal(room.players.get('a').score, 0);
  clearTimeout(room.timeout);
});
