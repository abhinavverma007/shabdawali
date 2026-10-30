import test from 'node:test';
import assert from 'node:assert/strict';
import * as sfx from '../lib/sfx.mjs';
import { SOUNDS, HAPTICS, tickFor, play, vibrate, feedback, canVibrate, scheduleNotes, __reset } from '../lib/sfx.mjs';

// A stand-in for the browser: records what would be played and buzzed.
function fakeBrowser({ audio = true, vibration = true, hidden = false } = {}) {
  const log = { oscillators: [], vibrations: [] };
  const mkParam = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  if (audio) {
    globalThis.AudioContext = class {
      constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
      createOscillator() { const o = { type: 'sine', frequency: mkParam(), connect() {}, start() {}, stop() {} }; log.oscillators.push(o); return o; }
      createGain() { return { gain: mkParam(), connect() {} }; }
      resume() { this.state = 'running'; }
    };
  } else delete globalThis.AudioContext;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: vibration ? { vibrate: (p) => (log.vibrations.push(p), true) } : {} });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { hidden } });
  __reset();
  return log;
}
function restore() {
  delete globalThis.AudioContext;
  delete globalThis.document;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: undefined });
  __reset();
}

test('every sound is short, quiet enough and made of sensible notes', () => {
  for (const [name, notes] of Object.entries(SOUNDS)) {
    assert.ok(notes.length >= 1, name);
    const length = Math.max(...notes.map((n) => n.t + n.d));
    assert.ok(length <= 1.2, `${name} lasts ${length}s`);
    for (const n of notes) {
      assert.ok(n.f >= 100 && n.f <= 2500, `${name} pitch ${n.f}`);
      assert.ok(!n.to || (n.to >= 100 && n.to <= 2500), `${name} glide ${n.to}`);
      assert.ok(n.d > 0 && n.d <= 0.6 && n.t >= 0, `${name} timing`);
      assert.ok(n.g > 0 && n.g <= 0.25, `${name} loudness ${n.g}`);
    }
  }
});

test('every game event has a sound, and the buzzes are brief', () => {
  for (const name of ['tap', 'remove', 'hint', 'correct', 'wrong', 'tick', 'tickUrgent', 'start', 'timeout', 'win', 'end']) assert.ok(SOUNDS[name], name);
  for (const [name, pattern] of Object.entries(HAPTICS)) {
    assert.ok(pattern.every((ms) => Number.isInteger(ms) && ms > 0), name);
    assert.ok(pattern.reduce((a, b) => a + b, 0) <= 500, `${name} buzzes too long`);
    assert.ok(name in SOUNDS, `${name} buzz has no matching sound`);
  }
});

test('the countdown ticks once a second for the last five seconds, sharper for the last three', () => {
  assert.equal(tickFor(6, null), null);
  assert.equal(tickFor(5, null), 'tick');
  assert.equal(tickFor(4, 5), 'tick');
  assert.equal(tickFor(3, 4), 'tickUrgent');
  assert.equal(tickFor(1, 2), 'tickUrgent');
  assert.equal(tickFor(0, 1), null, 'no tick at zero; the time-out sound takes over');
  assert.equal(tickFor(3, 3), null, 'the same second is never ticked twice');
  const heard = [];
  let last = null;
  for (let s = 30; s >= 0; s--) { const k = tickFor(s, last); if (k) { heard.push(k); last = s; } }
  assert.deepEqual(heard, ['tick', 'tick', 'tickUrgent', 'tickUrgent', 'tickUrgent']);
});

test('playing a sound makes one oscillator per note, always: there is no switch to turn it off', () => {
  const log = fakeBrowser();
  assert.equal(play('correct'), true);
  assert.equal(log.oscillators.length, SOUNDS.correct.length);
  assert.equal(play('tap'), true);
  assert.equal(log.oscillators.length, SOUNDS.correct.length + 1);
  restore();
});

test('there is no mute or preference interface at all', () => {
  for (const name of ['setPref', 'getPrefs', 'subscribePrefs', 'getServerPrefs']) assert.equal(sfx[name], undefined, name);
});

test('an unknown sound, a missing audio system and a hidden page all play nothing', () => {
  let log = fakeBrowser();
  assert.equal(play('nope'), false);
  assert.equal(log.oscillators.length, 0);
  log = fakeBrowser({ audio: false });
  assert.equal(play('tap'), false);
  log = fakeBrowser({ hidden: true });
  assert.equal(play('tap'), false);
  assert.equal(log.oscillators.length, 0, 'no noise from a tab nobody is looking at');
  restore();
});

test('vibration uses the pattern for the event, and nothing when unsupported or the page is hidden', () => {
  let log = fakeBrowser();
  assert.equal(canVibrate(), true);
  assert.equal(vibrate('correct'), true);
  assert.deepEqual(log.vibrations, [HAPTICS.correct]);
  assert.equal(vibrate('start'), false, 'no pattern for this event');

  log = fakeBrowser({ vibration: false });
  assert.equal(canVibrate(), false);
  assert.equal(vibrate('tap'), false);

  log = fakeBrowser({ hidden: true });
  assert.equal(vibrate('tap'), false);
  assert.deepEqual(log.vibrations, []);
  restore();
});

test('feedback gives both the sound and the buzz', () => {
  const log = fakeBrowser();
  feedback('wrong');
  assert.equal(log.oscillators.length, SOUNDS.wrong.length);
  assert.deepEqual(log.vibrations, [HAPTICS.wrong]);
  restore();
});

test('a phone without vibration still gets the sound, and one without audio still gets the buzz', () => {
  let log = fakeBrowser({ vibration: false });
  feedback('tap');
  assert.equal(log.oscillators.length, 1);
  log = fakeBrowser({ audio: false });
  feedback('tap');
  assert.deepEqual(log.vibrations, [HAPTICS.tap]);
  restore();
});

test('notes are scheduled at the right moments with a fade, so they do not click', () => {
  const calls = [];
  const rec = (n) => ({ setValueAtTime: (...a) => calls.push([n, 'set', ...a]), exponentialRampToValueAtTime: (...a) => calls.push([n, 'ramp', ...a]) });
  const c = {
    destination: {},
    createOscillator: () => ({ frequency: rec('freq'), connect() {}, start: (t) => calls.push(['osc', 'start', t]), stop: (t) => calls.push(['osc', 'stop', t]) }),
    createGain: () => ({ gain: rec('gain'), connect() {} }),
  };
  scheduleNotes(c, [{ f: 500, to: 400, t: 0.1, d: 0.2, g: 0.15 }], 1);
  assert.deepEqual(calls.find((x) => x[0] === 'osc' && x[1] === 'start'), ['osc', 'start', 1.1]);
  const stop = calls.find((x) => x[0] === 'osc' && x[1] === 'stop');
  assert.ok(stop[2] > 1.3 - 1e-9, 'stops just after the note ends');
  assert.ok(calls.some((x) => x[0] === 'freq' && x[1] === 'ramp' && x[2] === 400), 'glides to the target pitch');
  assert.ok(calls.some((x) => x[0] === 'gain' && x[1] === 'set' && x[2] < 0.001), 'starts silent');
});
