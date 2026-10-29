import test from 'node:test';
import assert from 'node:assert/strict';
import { rankPlayers } from '../lib/ranking.mjs';
import { bestKey, judgeScore, loadBest, saveBest } from '../lib/best.mjs';

const p = (id, score, left = false) => ({ id, name: id, score, left });

test('active players are ranked by score and ties share a rank', () => {
  const out = rankPlayers([p('a', 100), p('b', 300), p('c', 300), p('d', 50)]);
  assert.deepEqual(out.map((x) => [x.id, x.rank]), [['b', 1], ['c', 1], ['a', 3], ['d', 4]]);
});

test('players who left come after everyone who stayed and have no rank, even with the top score', () => {
  const out = rankPlayers([p('host', 900, true), p('a', 100), p('b', 300), p('quit', 50, true)]);
  assert.deepEqual(out.map((x) => [x.id, x.rank]), [['b', 1], ['a', 2], ['host', null], ['quit', null]]);
});

test('an empty list and an all-left list are fine', () => {
  assert.deepEqual(rankPlayers([]), []);
  assert.deepEqual(rankPlayers([p('a', 1, true)]).map((x) => x.rank), [null]);
});

test('the input list is not reordered or changed', () => {
  const input = [p('a', 1), p('b', 2)];
  rankPlayers(input);
  assert.deepEqual(input.map((x) => x.id), ['a', 'b']);
  assert.equal(input[0].rank, undefined);
});

test('the personal best is kept per language, rounds and seconds', () => {
  assert.equal(bestKey('hi', 5, 30), 'shabdawali.best.hi.5x30');
  assert.notEqual(bestKey('hi', 5, 30), bestKey('en', 5, 30));
  assert.notEqual(bestKey('hi', 5, 30), bestKey('hi', 5, 60));
});

test('the first game sets the best without a "new best" banner', () => {
  assert.deepEqual(judgeScore(null, 450), { best: 450, isNewBest: false, previous: null });
});

test('beating the best is a new best; equalling or missing it is not', () => {
  assert.deepEqual(judgeScore(450, 520), { best: 520, isNewBest: true, previous: 450 });
  assert.deepEqual(judgeScore(450, 450), { best: 450, isNewBest: false, previous: 450 });
  assert.deepEqual(judgeScore(450, 100), { best: 450, isNewBest: false, previous: 450 });
});

test('a first score of zero is stored as the best of 0, and anything above it later is a new best', () => {
  assert.deepEqual(judgeScore(null, 0), { best: 0, isNewBest: false, previous: null });
  assert.equal(judgeScore(0, 5).isNewBest, true);
});

test('with no usable storage, loading gives nothing and saving does not throw', () => {
  assert.equal(loadBest('x'), null);
  assert.doesNotThrow(() => saveBest('x', 5));
});

test('a stored value round-trips through storage when it is available', () => {
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v) };
  try {
    assert.equal(loadBest('k'), null);
    saveBest('k', 520);
    assert.equal(loadBest('k'), 520);
    store.set('k', 'not a number');
    assert.equal(loadBest('k'), null);
  } finally {
    delete globalThis.localStorage;
  }
});
