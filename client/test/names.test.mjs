import test from 'node:test';
import assert from 'node:assert/strict';
import { displayNames } from '../lib/names.mjs';

const roster = (...names) => names.map((name, i) => ({ id: `p${i}`, name }));
const labels = (...names) => {
  const m = displayNames(roster(...names));
  return names.map((_, i) => m.get(`p${i}`));
};

test('unique first names show as just the first name', () => {
  assert.deepEqual(labels('Kalpana Srivastava', 'Venkatasubramanian Iyer', 'Aishwarya Chaturvedi'), ['Kalpana', 'Venkatasubramanian', 'Aishwarya']);
});

test('a single-word name is left alone', () => {
  assert.deepEqual(labels('Asha', 'Bunty'), ['Asha', 'Bunty']);
});

test('players who share a first name get the initial of the next word', () => {
  assert.deepEqual(labels('Sangeeta Prasad', 'Sangeeta Srivastava', 'Kalpana Srivastava'), ['Sangeeta P.', 'Sangeeta S.', 'Kalpana']);
});

test('only the players who collide get extra detail', () => {
  assert.deepEqual(labels('Sangeeta Prasad', 'Rahul Verma', 'Sangeeta Srivastava'), ['Sangeeta P.', 'Rahul', 'Sangeeta S.']);
});

test('a bare first name next to a full name stays distinct without changing the bare one', () => {
  assert.deepEqual(labels('Sangeeta', 'Sangeeta Prasad'), ['Sangeeta', 'Sangeeta P.']);
});

test('same first name and same initial falls back to the full name for just those two', () => {
  assert.deepEqual(labels('Sangeeta Prasad', 'Sangeeta Pillai', 'Sangeeta Srivastava'), ['Sangeeta Prasad', 'Sangeeta Pillai', 'Sangeeta S.']);
});

test('exactly the same name gets a number on the short name, in joining order', () => {
  assert.deepEqual(labels('Rahul', 'Rahul', 'Rahul'), ['Rahul (1)', 'Rahul (2)', 'Rahul (3)']);
  assert.deepEqual(labels('Rahul Sharma', 'Rahul Sharma'), ['Rahul (1)', 'Rahul (2)']);
  // the number sits on the short name, so it survives a narrow chip; a different Rahul is not disturbed
  assert.deepEqual(labels('Kalpana Srivastava', 'Asha', 'Kalpana Srivastava'), ['Kalpana (1)', 'Asha', 'Kalpana (2)']);
});

test('grouping ignores case, extra spaces and keeps the typed spelling', () => {
  assert.deepEqual(labels('  rahul   verma ', 'Rahul Singh'), ['rahul v.', 'Rahul S.']);
});

test('Devanagari names: shared first name is split without cutting a conjunct in half', () => {
  const [a, b] = labels('कल्पना श्रीवास्तव', 'कल्पना शर्मा');
  assert.notEqual(a, b);
  assert.ok(a.startsWith('कल्पना ') && b.startsWith('कल्पना '));
  assert.ok(!/[्]\.$/.test(a), 'must not end on a dangling halant before the dot');
});

test('mixed scripts and a lone Devanagari name stay unchanged', () => {
  assert.deepEqual(labels('सुब्रमण्यम अय्यर', 'Kalpana Srivastava'), ['सुब्रमण्यम', 'Kalpana']);
});

test('every label in a roster is unique even in a messy room', () => {
  const names = ['Sangeeta Prasad', 'Sangeeta Prasad', 'sangeeta prasad', 'Sangeeta', 'Sangeeta S', 'Kalpana', 'Kalpana', 'Rahul K', 'Rahul Kumar'];
  const out = labels(...names);
  assert.equal(new Set(out.map((s) => s.toLowerCase())).size, out.length, out.join(' | '));
});

test('the original player ids are preserved and every player gets a label', () => {
  const m = displayNames([{ id: 'a', name: 'Ann Lee' }, { id: 'b', name: 'Bob Ray' }]);
  assert.deepEqual([...m.keys()], ['a', 'b']);
});

test('an empty roster is fine', () => {
  assert.equal(displayNames([]).size, 0);
});
