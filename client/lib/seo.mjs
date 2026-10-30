// Everything a search engine or a chat app reads about the site, in one place.
import { FAQ } from './faq.mjs';

// The public address. Set NEXT_PUBLIC_SITE_URL once you have your own domain; until then Vercel supplies the production URL.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://shabdawali.vercel.app')
).replace(/\/+$/, '');

export const SITE_NAME = 'शब्दावली · Shabdawali';
export const AUTHOR = { name: 'Abhinav Verma', url: 'https://in.linkedin.com/in/abhinavverma2' };
export const OG_IMAGE = { url: '/og-image.png', width: 1200, height: 630 };

export const COPY = {
  hi: {
    title: 'शब्दावली: हिन्दी और English शब्द पहेली खेल | परिवार के साथ मुफ़्त खेलें',
    description:
      'अक्षरों को सही क्रम में लगाकर शब्द बनाइए! रूम कोड से 10 लोगों तक के साथ खेलिए या अकेले अभ्यास कीजिए। हिन्दी और English में, बच्चों से बुज़ुर्गों तक सबके लिए। मुफ़्त, बिना डाउनलोड।',
    ogAlt: 'शब्दावली: हिन्दी और English शब्द पहेली खेल',
    locale: 'hi_IN',
    inviteTitle: (code) => `शब्दावली में मेरे साथ खेलिए! कमरा ${code}`,
    inviteDescription: (code) => `रूम कोड ${code} है। लिंक खोलिए, अपना नाम लिखिए और एक टैप में जुड़ जाइए। हिन्दी और English शब्द पहेली, मुफ़्त।`,
  },
  en: {
    title: 'Shabdawali: Free Hindi & English Jumbled Words Game to Play with Family',
    description:
      'Unscramble the letters to find the word! Play free with up to 10 friends and family using a room code, or practise solo. A Hindi and English word puzzle for kids and grandparents. No download, works in your browser.',
    ogAlt: 'Shabdawali: Hindi and English jumbled words game',
    locale: 'en_IN',
    inviteTitle: (code) => `Join my Shabdawali game! Room ${code}`,
    inviteDescription: (code) => `The room code is ${code}. Open the link, type your name and join in one tap. A free Hindi and English word puzzle.`,
  },
};

export const KEYWORDS = [
  'शब्द पहेली',
  'हिन्दी शब्द खेल',
  'अक्षर जोड़कर शब्द बनाओ',
  'शब्दावली खेल',
  'jumbled words game',
  'word scramble',
  'Hindi word game',
  'Hindi jumbled words',
  'anagram game Hindi',
  'multiplayer word game',
  'family word game India',
  'word puzzle for kids and grandparents',
  'free online word game',
  'play with friends on WhatsApp',
];

// A room code is exactly 4 letters/digits. Anything else in the address is ignored, never echoed into a page.
export function cleanRoomCode(value) {
  const v = String(Array.isArray(value) ? value[0] : (value ?? '')).trim().toUpperCase();
  return /^[A-Z0-9]{4}$/.test(v) ? v : null;
}

export function cleanLang(value, fallback = 'hi') {
  const v = Array.isArray(value) ? value[0] : value;
  return v === 'en' || v === 'hi' ? v : fallback;
}

// Metadata for one page of the game. `path` is the page ("/" or "/en"); a shared room link gets a "join me" preview
// and is kept out of search results, since it is a private, short-lived address.
export function buildMetadata({ lang = 'hi', room = null, path = '/' } = {}) {
  const c = COPY[lang];
  const code = cleanRoomCode(room);
  const title = code ? c.inviteTitle(code) : c.title;
  const description = code ? c.inviteDescription(code) : c.description;
  const other = lang === 'hi' ? 'en' : 'hi';

  const verification = {};
  if (process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION) verification.google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
  if (process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION) verification.other = { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION };

  return {
    title: { absolute: title },
    description,
    keywords: KEYWORDS,
    alternates: {
      canonical: path,
      languages: { 'hi-IN': '/', 'en-IN': '/en', 'x-default': '/' },
    },
    robots: code
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    openGraph: {
      type: 'website',
      // A room link has no og:url on purpose: scrapers such as Facebook's follow og:url, and pointing it at the plain home
      // page would show the home page's preview instead of the "join my game" one.
      ...(code ? {} : { url: path }),
      siteName: SITE_NAME,
      title,
      description,
      locale: c.locale,
      alternateLocale: [COPY[other].locale],
      images: [{ ...OG_IMAGE, alt: c.ogAlt, type: 'image/png' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [{ url: OG_IMAGE.url, alt: c.ogAlt }] },
    ...(Object.keys(verification).length ? { verification } : {}),
  };
}

// The "how to play" page, one per language. It is the page with real text for search engines to read: the rules,
// the scoring and the questions people ask.
export const GUIDE = {
  hi: {
    title: 'शब्दावली कैसे खेलें: नियम, अंक और सुझाव | हिन्दी शब्द पहेली',
    description:
      'शब्दावली खेलना सीखिए: बिखरे अक्षरों को सही क्रम में लगाकर शब्द बनाइए। रूम कोड से दोस्तों और परिवार के साथ खेलने के नियम, अंक कैसे मिलते हैं, संकेत और अक्सर पूछे जाने वाले सवाल।',
  },
  en: {
    title: 'How to Play Shabdawali: Rules, Scoring and Tips | Hindi & English Word Puzzle',
    description:
      'Learn to play Shabdawali: tap the scrambled letters into the right order to spell the word. Rules for playing with family and friends using a room code, how scoring works, hints, and answers to common questions.',
  },
};

export function buildGuideMetadata(lang) {
  const c = COPY[lang];
  const g = GUIDE[lang];
  const path = lang === 'hi' ? '/how-to-play' : '/en/how-to-play';
  return {
    title: { absolute: g.title },
    description: g.description,
    keywords: KEYWORDS,
    alternates: { canonical: path, languages: { 'hi-IN': '/how-to-play', 'en-IN': '/en/how-to-play', 'x-default': '/how-to-play' } },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    openGraph: {
      type: 'article',
      url: path,
      siteName: SITE_NAME,
      title: g.title,
      description: g.description,
      locale: c.locale,
      alternateLocale: [COPY[lang === 'hi' ? 'en' : 'hi'].locale],
      images: [{ ...OG_IMAGE, alt: c.ogAlt, type: 'image/png' }],
    },
    twitter: { card: 'summary_large_image', title: g.title, description: g.description, images: [{ url: OG_IMAGE.url, alt: c.ogAlt }] },
  };
}

// Structured data that tells search engines what this site is.
export function siteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: 'Shabdawali',
        alternateName: 'शब्दावली',
        inLanguage: ['hi-IN', 'en-IN'],
        publisher: { '@id': `${SITE_URL}/#author` },
      },
      {
        '@type': ['WebApplication', 'Game'],
        '@id': `${SITE_URL}/#app`,
        name: 'Shabdawali',
        alternateName: ['शब्दावली', 'Shabdawali Jumbled Words'],
        url: SITE_URL,
        description: COPY.en.description,
        applicationCategory: 'GameApplication',
        genre: ['Word game', 'Puzzle', 'Multiplayer game'],
        operatingSystem: 'Any (works in a web browser)',
        browserRequirements: 'Requires JavaScript',
        inLanguage: ['hi-IN', 'en-IN'],
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
        image: `${SITE_URL}${OG_IMAGE.url}`,
        audience: { '@type': 'PeopleAudience', suggestedMinAge: 7 },
        playMode: ['SinglePlayer', 'MultiPlayer'],
        numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 10 },
        author: { '@id': `${SITE_URL}/#author` },
      },
      {
        '@type': 'Person',
        '@id': `${SITE_URL}/#author`,
        name: AUTHOR.name,
        url: AUTHOR.url,
        sameAs: [AUTHOR.url],
      },
    ],
  };
}

export function faqJsonLd(lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: lang === 'hi' ? 'hi-IN' : 'en-IN',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q[lang],
      acceptedAnswer: { '@type': 'Answer', text: item.a[lang] },
    })),
  };
}
