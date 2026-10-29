import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');

// One tile = one akshara: base letter, optional nukta, halant+consonant conjuncts, then matras/anusvara.
const DEVANAGARI_UNIT =
  /[ऄ-हक़-ॡ](?:़)?(?:्[क-ह](?:़)?)*[ा-ौॅ-ॉॎॏँ-ःॢॣ]*|./gsu;

export function splitUnits(word, lang) {
  return lang === 'hi' ? word.match(DEVANAGARI_UNIT) : [...word.toUpperCase()];
}

// The PRD tiers are 3-4 / 5-6 / 7+ letters. A Hindi tile is a whole akshara, so a Hindi word has
// far fewer tiles than an English one has letters: 3 tiles is easy, 4 medium, 5 or more hard.
export function tierOf(unitCount, lang = 'en') {
  if (lang === 'hi') return unitCount <= 3 ? 'easy' : unitCount === 4 ? 'medium' : 'hard';
  if (unitCount <= 4) return 'easy';
  if (unitCount <= 6) return 'medium';
  return 'hard';
}

export function anagramKey(units) {
  return [...units].sort().join('|');
}

const MIN_UNITS = 3;
const MAX_UNITS = 8;

function load(file, lang) {
  const { words } = JSON.parse(readFileSync(path.join(dataDir, file), 'utf8'));
  const pool = { all: [], easy: [], medium: [], hard: [], byKey: new Map() };
  for (const { w, c } of words) {
    const units = splitUnits(w, lang);
    if (units.length < MIN_UNITS || units.length > MAX_UNITS) continue;
    const entry = { word: w, category: c, units };
    pool.all.push(entry);
    pool[tierOf(units.length, lang)].push(entry);
    const key = anagramKey(units);
    if (!pool.byKey.has(key)) pool.byKey.set(key, new Set());
    pool.byKey.get(key).add(units.join(''));
  }
  return pool;
}

export const pools = {
  hi: load('hindi_words.json', 'hi'),
  en: load('english_words.json', 'en'),
};

function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function scramble(units, rand = Math.random) {
  if (new Set(units).size === 1) return [...units];
  let out;
  do out = shuffle(units, rand);
  while (out.join('') === units.join(''));
  return out;
}

// Rounds ramp easy -> medium -> hard so mixed-age groups warm up; falls back to any tier if one runs dry.
// `exclude` holds words this room has already played; once fewer fresh words remain than rounds
// requested, the history is ignored so a long-running room never runs dry.
export function pickWords(lang, rounds, rand = Math.random, exclude = new Set()) {
  const pool = pools[lang];
  const chosen = [];
  const fresh = pool.all.filter((e) => !exclude.has(e.word)).length;
  const used = new Set(fresh >= rounds ? exclude : []);
  for (let i = 0; i < rounds; i++) {
    const frac = rounds === 1 ? 0 : i / (rounds - 1);
    const tier = frac < 0.4 ? 'easy' : frac < 0.8 ? 'medium' : 'hard';
    const candidates =
      [pool[tier], pool.all].map((l) => l.filter((e) => !used.has(e.word))).find((l) => l.length) ?? pool.all;
    const pick = candidates[Math.floor(rand() * candidates.length)];
    used.add(pick.word);
    chosen.push(pick);
  }
  return chosen;
}

// Any pool word that is an anagram of the target counts, so valid alternates are not marked wrong.
export function isCorrect(lang, target, answerUnits) {
  const answer = answerUnits.join('');
  if (answer === target.units.join('')) return true;
  const alts = pools[lang].byKey.get(anagramKey(answerUnits));
  return !!alts && alts.has(answer);
}
