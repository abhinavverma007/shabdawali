// Sound and vibration for the game. The sounds are made on the fly with the browser's Web Audio (a few short notes
// each), so there are no audio files to download and it works offline. They are always on; the phone's own volume and
// silent switch decide what is actually heard. Nothing plays until the player has tapped something (browsers insist),
// and nothing plays from a tab nobody is looking at.

// ---------------------------------------------------------------------------------------------- the sounds
// Each note: f = pitch in Hz, t = start (seconds), d = length, g = loudness (kept modest), type = wave shape,
// to = glide to this pitch by the end of the note.
export const SOUNDS = {
  tap: [{ f: 560, to: 430, t: 0, d: 0.06, g: 0.16, type: 'triangle' }],
  remove: [{ f: 340, to: 260, t: 0, d: 0.06, g: 0.12, type: 'triangle' }],
  hint: [
    { f: 880, t: 0, d: 0.12, g: 0.14 },
    { f: 1175, t: 0.1, d: 0.14, g: 0.14 },
  ],
  correct: [
    { f: 523, t: 0, d: 0.12, g: 0.2 },
    { f: 659, t: 0.09, d: 0.12, g: 0.2 },
    { f: 784, t: 0.18, d: 0.12, g: 0.2 },
    { f: 1047, t: 0.27, d: 0.3, g: 0.22 },
  ],
  wrong: [{ f: 210, to: 130, t: 0, d: 0.26, g: 0.1, type: 'sawtooth' }],
  tick: [{ f: 900, t: 0, d: 0.045, g: 0.12 }],
  tickUrgent: [{ f: 1250, t: 0, d: 0.08, g: 0.2 }],
  start: [{ f: 392, to: 523, t: 0, d: 0.16, g: 0.1 }],
  timeout: [
    { f: 330, t: 0, d: 0.18, g: 0.16, type: 'triangle' },
    { f: 262, t: 0.16, d: 0.3, g: 0.16, type: 'triangle' },
  ],
  win: [
    { f: 523, t: 0, d: 0.13, g: 0.2 },
    { f: 659, t: 0.11, d: 0.13, g: 0.2 },
    { f: 784, t: 0.22, d: 0.13, g: 0.2 },
    { f: 1047, t: 0.33, d: 0.13, g: 0.2 },
    { f: 1319, t: 0.44, d: 0.55, g: 0.22 },
    { f: 1047, t: 0.44, d: 0.55, g: 0.14 },
  ],
  end: [
    { f: 523, t: 0, d: 0.22, g: 0.12 },
    { f: 392, t: 0.2, d: 0.34, g: 0.12 },
  ],
};

// Vibration patterns in milliseconds (buzz, pause, buzz...). Kept short so they feel like a tap, not an alarm.
export const HAPTICS = {
  tap: [8],
  remove: [6],
  hint: [20],
  correct: [40, 40, 80],
  wrong: [120],
  tickUrgent: [25],
  timeout: [200],
  win: [60, 60, 60, 60, 220],
};

// ---------------------------------------------------------------------------------------------- the countdown
// Which tick to play when the clock shows `secondsLeft`: soft for 5 and 4, sharper for 3, 2 and 1, one per second.
export function tickFor(secondsLeft, lastTicked) {
  if (secondsLeft === lastTicked) return null;
  if (secondsLeft >= 4 && secondsLeft <= 5) return 'tick';
  if (secondsLeft >= 1 && secondsLeft <= 3) return 'tickUrgent';
  return null;
}

// ---------------------------------------------------------------------------------------------- playing
let ctx = null;

function audioContext() {
  if (ctx) return ctx;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

// Call from a tap or key press: browsers (iPhone Safari especially) only let sound start from a user gesture.
export function unlock() {
  const c = audioContext();
  if (c && c.state === 'suspended') c.resume?.();
}

export function scheduleNotes(c, notes, t0) {
  for (const n of notes) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    const start = t0 + n.t;
    const end = start + n.d;
    osc.type = n.type ?? 'sine';
    osc.frequency.setValueAtTime(n.f, start);
    if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, end);
    // A quick fade in and out avoids the clicks that a note starting or stopping abruptly makes.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(n.g, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}

const hidden = () => !!globalThis.document?.hidden;

export function play(name) {
  const notes = SOUNDS[name];
  if (!notes || hidden()) return false;
  const c = audioContext();
  if (!c) return false;
  if (c.state === 'suspended') c.resume?.();
  scheduleNotes(c, notes, c.currentTime + 0.01);
  return true;
}

export const canVibrate = () => typeof globalThis.navigator?.vibrate === 'function';

export function vibrate(name) {
  const pattern = HAPTICS[name];
  if (!pattern || !canVibrate() || hidden()) return false;
  try {
    return globalThis.navigator.vibrate(pattern) !== false;
  } catch {
    return false;
  }
}

// What most game events want: the sound and the buzz together.
export function feedback(name) {
  play(name);
  vibrate(name);
}

// For tests only: forget the audio system this module has created.
export function __reset() {
  ctx = null;
}
