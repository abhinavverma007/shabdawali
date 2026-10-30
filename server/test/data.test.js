import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { splitUnits, pools } from '../src/words.js';

const load = (file) => JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8')).words;

for (const [lang, file] of [['hi', 'hindi_words.json'], ['en', 'english_words.json']]) {
  test(`${file}: 6000 unique, well-formed words that all become playable puzzles`, () => {
    const words = load(file);
    assert.equal(words.length, 6000);

    const list = words.map((e) => e.w);
    assert.equal(new Set(list).size, list.length, 'duplicate words');

    for (const w of list) {
      assert.equal(w, w.normalize('NFC'), `${w} is not NFC`);
      assert.ok(lang === 'en' ? /^[a-z]{3,8}$/.test(w) : /^[ऀ-ॿ]+$/.test(w), `bad characters in ${w}`);
      const n = splitUnits(w, lang).length;
      assert.ok(n >= 3 && n <= 8, `${w} has ${n} tiles`);
    }
    assert.equal(pools[lang].all.length, 6000, 'every word must survive the loader');
  });

  test(`${file}: every difficulty tier has enough words`, () => {
    for (const tier of ['easy', 'medium', 'hard']) assert.ok(pools[lang][tier].length >= 100, `${lang} ${tier}: ${pools[lang][tier].length}`);
  });
}
