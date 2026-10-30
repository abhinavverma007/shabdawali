import { FAQ } from '../lib/faq.mjs';
import { faqJsonLd } from '../lib/seo.mjs';

// A plain, readable page (no scripts needed) that explains the game. This is the text search engines index, so it
// says what the game is, how to play, how scoring works, and answers the questions people ask. Every fact here
// matches the game: 4-character room codes, up to 10 players, 3/5/8/10 rounds, 20/30/45/60 seconds,
// 100 points + up to 100 for speed, hints cost 25 and 10.
const TEXT = {
  hi: {
    htmlLang: 'hi',
    h1: 'शब्दावली कैसे खेलें',
    intro:
      'शब्दावली एक हिन्दी और English शब्द पहेली खेल है। स्क्रीन पर बिखरे हुए अक्षर दिखते हैं; उन पर टैप करके उन्हें सही क्रम में लगाइए और शब्द बनाइए। रूम कोड से 10 लोगों तक के साथ खेलिए, या अकेले अभ्यास कीजिए। यह मुफ़्त है, कुछ डाउनलोड नहीं करना पड़ता और बच्चों से लेकर बुज़ुर्गों तक सब खेल सकते हैं।',
    play: 'अभी खेलिए',
    stepsTitle: 'खेल की शुरुआत कैसे करें',
    steps: [
      'अपना नाम लिखिए, फिर "कमरा बनाएँ" या "अकेले खेलें" दबाइए।',
      'कमरा बनाने पर 4 अक्षर का कोड मिलता है। कोड या लिंक WhatsApp पर भेज दीजिए; दोस्त लिंक खोलकर अपना नाम लिखें और जुड़ जाएँगे। एक कमरे में 10 लोग तक हो सकते हैं।',
      'मेज़बान भाषा (हिन्दी या English), राउंड (3, 5, 8 या 10) और हर शब्द का समय (20, 30, 45 या 60 सेकंड) चुनकर "खेल शुरू करें" दबाता है।',
      'बिखरे अक्षरों की टाइल पर टैप करके उन्हें ऊपर के खाली खानों में सही क्रम में लगाइए। ग़लत जगह लग जाए तो लगी हुई टाइल पर फिर टैप करके हटा लीजिए, या "सब हटाएँ" दबाकर सारी टाइलें एक साथ वापस ले लीजिए। क्रम पूरा होते ही शब्द अपने-आप जाँचा जाता है।',
      'सब खिलाड़ी एक ही समय पर एक ही शब्द हल करते हैं। हर राउंड के बाद सही शब्द और सबका स्कोर दिखता है, और अंत में विजेताओं का मंच।',
    ],
    scoreTitle: 'अंक कैसे मिलते हैं',
    score: [
      'हर सही शब्द के 100 अंक मिलते हैं।',
      'जल्दी हल करने पर 100 अंक तक और मिलते हैं: जितना ज़्यादा समय बचे, उतने ज़्यादा अंक।',
      'संकेत लेने पर अंक कटते हैं: पहला अक्षर देखने के 25 और श्रेणी का संकेत देखने के 10 अंक।',
      'ग़लत कोशिश के अंक नहीं कटते, इसलिए बेझिझक आज़माइए।',
      'समय खत्म होने तक जो शब्द हल न हो, उसके 0 अंक।',
    ],
    hintsTitle: 'संकेत',
    hints:
      'अटक जाएँ तो "पहला अक्षर" दबाने पर शब्द का पहला अक्षर दिखता है, और "संकेत" दबाने पर शब्द की श्रेणी (जैसे फल, जानवर, रंग) बताई जाती है। हर संकेत हर शब्द में एक बार मिलता है।',
    soloTitle: 'अकेले खेलना',
    solo:
      'अकेले खेलने पर 5 राउंड होते हैं और अंत में आपका स्कोर, आपका सबसे ऊँचा स्कोर और हर शब्द का समय दिखता है। "सेटिंग्स" से भाषा, राउंड और समय बदल सकते हैं।',
    tipsTitle: 'कुछ सुझाव',
    tips: [
      'परिवार के साथ खेलना हो तो एक फ़ोन से कमरा बनाइए और WhatsApp का बटन दबाकर कोड सबको भेज दीजिए।',
      'बच्चों और बुज़ुर्गों के लिए 45 या 60 सेकंड चुनिए, ताकि सोचने का समय मिले।',
      'फ़ुल स्क्रीन और ऐप जैसे अनुभव के लिए इसे अपने फ़ोन की होम स्क्रीन पर जोड़ लीजिए।',
    ],
    faqTitle: 'अक्सर पूछे जाने वाले सवाल',
    otherLang: { label: 'Read this in English', href: '/en/how-to-play' },
  },
  en: {
    htmlLang: 'en',
    h1: 'How to play Shabdawali',
    intro:
      'Shabdawali is a Hindi and English jumbled words game. Scrambled letters appear on the screen; tap them into the right order to spell the word. Play with up to 10 people using a room code, or practise solo. It is free, there is nothing to download, and everyone from children to grandparents can play.',
    play: 'Play now',
    stepsTitle: 'How to start a game',
    steps: [
      'Type your name, then tap "Create Room" or "Play Solo".',
      'Creating a room gives you a 4-character code. Share the code or the link on WhatsApp; friends open the link, type their name and join. A room holds up to 10 players.',
      'The host picks the language (Hindi or English), the number of rounds (3, 5, 8 or 10) and the seconds per word (20, 30, 45 or 60), then taps "Start Game".',
      'Tap the scrambled letter tiles to place them in the empty slots above, in the right order. If one lands in the wrong place, tap the placed tile to take it back, or tap "Clear" to take all the tiles back at once. The word is checked automatically as soon as the slots are full.',
      'Everyone solves the same word at the same time. After each round you see the right word and everyone\'s score, and at the end the winners\' podium.',
    ],
    scoreTitle: 'How scoring works',
    score: [
      'Every word you solve earns 100 points.',
      'Solving quickly earns up to 100 more: the more time is left, the more bonus points.',
      'Hints cost points: 25 for the first letter and 10 for the category hint.',
      'Wrong attempts cost nothing, so try freely.',
      'A word you do not solve before time runs out scores 0.',
    ],
    hintsTitle: 'Hints',
    hints:
      'If you are stuck, "First letter" reveals the first letter of the word and "Hint" shows its category (for example fruit, animal or colour). Each hint can be used once per word.',
    soloTitle: 'Playing solo',
    solo:
      'A solo game has 5 rounds and finishes with your score, your personal best and the time you took for each word. Use "Settings" to change the language, rounds and time.',
    tipsTitle: 'A few tips',
    tips: [
      'To play with family, create a room on one phone and tap the WhatsApp button to send everyone the code.',
      'For children and grandparents choose 45 or 60 seconds so there is time to think.',
      'Add the game to your phone\'s home screen for a full-screen, app-like experience.',
    ],
    faqTitle: 'Frequently asked questions',
    otherLang: { label: 'हिन्दी में पढ़ें', href: '/how-to-play' },
  },
};

export default function HowToPlay({ lang }) {
  const t = TEXT[lang];
  const playHref = lang === 'hi' ? '/' : '/en';
  return (
    <main lang={t.htmlLang} className="mx-auto w-full max-w-2xl px-4 py-8 text-stone-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(lang)) }} />
      <article className="flex flex-col gap-6">
        <header className="flex flex-col gap-3">
          <h1 className="text-4xl font-extrabold leading-tight text-orange-700">{t.h1}</h1>
          <p className="text-lg leading-relaxed">{t.intro}</p>
          <div className="flex flex-wrap items-center gap-4">
            <a href={playHref} className="btn-primary inline-flex items-center">
              {t.play} →
            </a>
            <a href={t.otherLang.href} hrefLang={lang === 'hi' ? 'en' : 'hi'} className="text-lg font-semibold underline">
              {t.otherLang.label}
            </a>
          </div>
        </header>

        <section className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold">{t.stepsTitle}</h2>
          <ol className="list-decimal space-y-2 pl-6 text-lg leading-relaxed">
            {t.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold">{t.scoreTitle}</h2>
          <ul className="list-disc space-y-1 pl-6 text-lg leading-relaxed">
            {t.score.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold">{t.hintsTitle}</h2>
          <p className="text-lg leading-relaxed">{t.hints}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold">{t.soloTitle}</h2>
          <p className="text-lg leading-relaxed">{t.solo}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold">{t.tipsTitle}</h2>
          <ul className="list-disc space-y-1 pl-6 text-lg leading-relaxed">
            {t.tips.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-2xl font-bold">{t.faqTitle}</h2>
          {FAQ.map((item) => (
            <div key={item.q.en}>
              <h3 className="text-xl font-bold">{item.q[lang]}</h3>
              <p className="text-lg leading-relaxed">{item.a[lang]}</p>
            </div>
          ))}
        </section>

        <a href={playHref} className="btn-primary inline-flex items-center justify-center self-start">
          {t.play} →
        </a>
      </article>
    </main>
  );
}
