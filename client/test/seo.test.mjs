import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMetadata, buildGuideMetadata, GUIDE, cleanRoomCode, cleanLang, siteJsonLd, faqJsonLd, COPY, KEYWORDS, SITE_URL } from '../lib/seo.mjs';
import { FAQ } from '../lib/faq.mjs';

test('room codes: exactly 4 letters or digits, anything else is ignored', () => {
  assert.equal(cleanRoomCode('ecp4'), 'ECP4');
  assert.equal(cleanRoomCode(' B4K2 '), 'B4K2');
  assert.equal(cleanRoomCode(['ABCD', 'x']), 'ABCD');
  for (const bad of ['', 'ABC', 'ABCDE', 'AB<>', '"><script>', undefined, null, 'AB CD']) assert.equal(cleanRoomCode(bad), null, String(bad));
});

test('language: only hi or en, otherwise the default', () => {
  assert.equal(cleanLang('en'), 'en');
  assert.equal(cleanLang('hi'), 'hi');
  assert.equal(cleanLang('fr'), 'hi');
  assert.equal(cleanLang(undefined, 'en'), 'en');
});

test('the home page has what WhatsApp, Facebook and Twitter need for a preview', () => {
  const m = buildMetadata({ lang: 'hi', path: '/' });
  assert.equal(m.openGraph.type, 'website');
  assert.ok(m.openGraph.title && m.openGraph.description && m.openGraph.url);
  const img = m.openGraph.images[0];
  assert.equal(img.url, '/og-image.png');
  assert.equal(img.width, 1200);
  assert.equal(img.height, 630);
  assert.ok(img.alt);
  assert.equal(m.twitter.card, 'summary_large_image');
  assert.equal(m.twitter.images[0].url, '/og-image.png');
});

test('title and description are a sensible length for Google and for link previews', () => {
  for (const lang of ['hi', 'en']) {
    const c = COPY[lang];
    assert.ok(c.title.length >= 30 && c.title.length <= 100, `${lang} title ${c.title.length}`);
    assert.ok(c.description.length >= 100 && c.description.length <= 300, `${lang} description ${c.description.length}`);
  }
});

test('the English page is its own entry point with English text and hreflang for both', () => {
  const en = buildMetadata({ lang: 'en', path: '/en' });
  assert.match(en.title.absolute, /Hindi & English/);
  assert.equal(en.alternates.canonical, '/en');
  assert.deepEqual(en.alternates.languages, { 'hi-IN': '/', 'en-IN': '/en', 'x-default': '/' });
  assert.equal(en.openGraph.locale, 'en_IN');
  assert.deepEqual(en.openGraph.alternateLocale, ['hi_IN']);
  const hi = buildMetadata({ lang: 'hi', path: '/' });
  assert.equal(hi.openGraph.locale, 'hi_IN');
  assert.match(hi.title.absolute, /शब्दावली/);
});

test('the home page is indexable', () => {
  const m = buildMetadata({ lang: 'hi' });
  assert.equal(m.robots.index, true);
  assert.equal(m.robots.follow, true);
  assert.equal(m.robots.googleBot['max-image-preview'], 'large');
});

test('a shared room link gets a "join me" preview with the code, and is kept out of search results', () => {
  const m = buildMetadata({ lang: 'en', room: 'ecp4' });
  assert.equal(m.title.absolute, 'Join my Shabdawali game! Room ECP4');
  assert.match(m.description, /ECP4/);
  assert.equal(m.openGraph.url, undefined, 'no og:url, so a scraper keeps the link it was given');
  assert.equal(buildMetadata({ lang: 'en', path: '/en' }).openGraph.url, '/en');
  assert.deepEqual(m.robots, { index: false, follow: false });
  assert.equal(m.alternates.canonical, '/', 'the canonical stays the plain home page');
  const hi = buildMetadata({ lang: 'hi', room: 'ECP4' });
  assert.match(hi.title.absolute, /ECP4/);
  assert.match(hi.title.absolute, /शब्दावली/);
});

test('a junk room value in the address never reaches the metadata', () => {
  const m = buildMetadata({ lang: 'en', room: '"><script>alert(1)</script>' });
  assert.equal(m.title.absolute, COPY.en.title);
  assert.ok(!JSON.stringify(m).includes('alert(1)') && !JSON.stringify(m).includes('<script'));
  assert.equal(m.robots.index, true);
});

test('keywords cover Hindi and English search phrases', () => {
  assert.ok(KEYWORDS.some((k) => /[ऀ-ॿ]/.test(k)));
  assert.ok(KEYWORDS.includes('jumbled words game'));
  assert.equal(new Set(KEYWORDS).size, KEYWORDS.length, 'no duplicate keywords');
});

test('site structured data describes a free, playable game with its author', () => {
  const g = siteJsonLd();
  assert.equal(g['@context'], 'https://schema.org');
  const app = g['@graph'].find((n) => Array.isArray(n['@type']) && n['@type'].includes('WebApplication'));
  assert.equal(app.isAccessibleForFree, true);
  assert.equal(app.offers.price, '0');
  assert.deepEqual(app.inLanguage, ['hi-IN', 'en-IN']);
  assert.equal(app.numberOfPlayers.maxValue, 10);
  const person = g['@graph'].find((n) => n['@type'] === 'Person');
  assert.equal(person.name, 'Abhinav Verma');
  assert.equal(app.author['@id'], person['@id']);
  assert.ok(app.image.startsWith(SITE_URL));
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(g)));
});

test('FAQ data: every question has an answer in both languages, and the structured data mirrors it exactly', () => {
  assert.ok(FAQ.length >= 5);
  for (const item of FAQ) for (const lang of ['hi', 'en']) assert.ok(item.q[lang].length > 5 && item.a[lang].length > 20);
  for (const lang of ['hi', 'en']) {
    const ld = faqJsonLd(lang);
    assert.equal(ld['@type'], 'FAQPage');
    assert.equal(ld.mainEntity.length, FAQ.length);
    assert.equal(ld.mainEntity[0].name, FAQ[0].q[lang]);
    assert.equal(ld.mainEntity[0].acceptedAnswer.text, FAQ[0].a[lang]);
  }
});

test('the FAQ states the scoring the game really uses', () => {
  const en = FAQ.map((f) => f.a.en).join(' ');
  assert.match(en, /100 points/);
  assert.match(en, /25 points/);
  assert.match(en, /10 players|10\b/);
});

test('the how-to-play pages: one per language, each indexable, each pointing at the other', () => {
  const hi = buildGuideMetadata('hi');
  const en = buildGuideMetadata('en');
  assert.equal(hi.alternates.canonical, '/how-to-play');
  assert.equal(en.alternates.canonical, '/en/how-to-play');
  assert.deepEqual(hi.alternates.languages, en.alternates.languages);
  assert.equal(hi.robots.index, true);
  assert.equal(en.robots.index, true);
  assert.equal(hi.openGraph.images[0].width, 1200);
  assert.equal(en.openGraph.url, '/en/how-to-play');
  assert.match(hi.title.absolute, /कैसे खेलें/);
  assert.match(en.title.absolute, /How to Play/);
  for (const lang of ['hi', 'en']) {
    assert.ok(GUIDE[lang].title.length <= 100 && GUIDE[lang].description.length >= 100 && GUIDE[lang].description.length <= 300);
  }
});
