// The guide opens in a new tab so a player in a waiting room is not taken out of their game.
const GUIDE_LINK = {
  hi: { label: 'खेल कैसे खेलें', href: '/how-to-play' },
  en: { label: 'How to play', href: '/en/how-to-play' },
};

export default function Footer({ lang = 'hi' }) {
  const guide = GUIDE_LINK[lang] ?? GUIDE_LINK.hi;
  return (
    <footer className="pt-2 text-center text-xs text-stone-600">
      Made with <span aria-label="love">❤️</span> by{' '}
      <a
        href="https://in.linkedin.com/in/abhinavverma2"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold underline underline-offset-2"
      >
        Abhinav Verma
      </a>
      {' · '}
      <a href={guide.href} target="_blank" rel="noopener" hrefLang={lang} className="font-semibold underline underline-offset-2">
        {guide.label}
      </a>
    </footer>
  );
}
