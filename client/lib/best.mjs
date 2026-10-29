// Personal best for solo play. A score is only comparable with games of the same shape, so the best is kept per
// language, number of rounds and seconds per word. Storage can be blocked (private mode), so every access is guarded.

export const bestKey = (lang, rounds, timer) => `shabdawali.best.${lang}.${rounds}x${timer}`;

// previous: the stored best (or null if this is the first game of this kind).
export function judgeScore(previous, score) {
  const had = typeof previous === 'number' && Number.isFinite(previous);
  return {
    best: had ? Math.max(previous, score) : score,
    // Nothing to beat on the very first game, so no banner then.
    isNewBest: had && score > previous,
    previous: had ? previous : null,
  };
}

export function loadBest(key) {
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) && localStorage.getItem(key) !== null ? v : null;
  } catch {
    return null;
  }
}

export function saveBest(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {}
}
