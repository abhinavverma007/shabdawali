import { Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import FullscreenOnTap from '../components/FullscreenOnTap';
import { SITE_URL, SITE_NAME, AUTHOR, COPY, KEYWORDS, siteJsonLd } from '../lib/seo.mjs';

const font = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-devanagari',
});

// Site-wide defaults. Each page (/, /en and the how-to-play pages) sets its own title, description, canonical address
// and preview image on top of these; metadataBase turns their relative addresses into the full https:// ones that
// WhatsApp, Facebook and Google need.
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: COPY.hi.title, template: '%s' },
  description: COPY.hi.description,
  applicationName: SITE_NAME,
  keywords: KEYWORDS,
  authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
  creator: AUTHOR.name,
  publisher: AUTHOR.name,
  category: 'games',
  formatDetection: { telephone: false, email: false, address: false },
  icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
  // iPhone: when added to the home screen, open without Safari's bars.
  appleWebApp: { capable: true, title: 'शब्दावली', statusBarStyle: 'black-translucent' },
};

// viewport-fit=cover lets the page use the full screen including around the notch; globals.css pads the safe areas.
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#ea580c' };

export default function RootLayout({ children }) {
  return (
    <html lang="hi" className={font.variable}>
      <body className="font-sans antialiased">
        {/* Anything typed into a form before the page's scripts finish loading is wiped when React takes over.
            This runs first and remembers it (inputs opt in with data-prefill) so the form can restore it. */}
        {/* A plain inline script on purpose: next/script's beforeInteractive still waits for the app's JS bundle. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.addEventListener('input',function(e){var t=e.target,k=t&&t.getAttribute&&t.getAttribute('data-prefill');if(k){(window.__prefill=window.__prefill||{})[k]=t.value}},true);",
          }}
        />
        {/* Tells search engines what this site is: a free, two-language, multiplayer word game by Abhinav Verma. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd()) }} />
        <FullscreenOnTap />
        {children}
        {/* Seen only with scripts off (and by simple crawlers): what the site is and where the rules are. */}
        <noscript>
          <p style={{ padding: '1rem', textAlign: 'center' }}>
            शब्दावली एक हिन्दी और English शब्द पहेली खेल है, जिसे चलाने के लिए JavaScript चाहिए। Shabdawali is a free Hindi and English jumbled
            words game and needs JavaScript. <a href="/how-to-play">खेल कैसे खेलें</a> · <a href="/en/how-to-play">How to play</a>
          </p>
        </noscript>
      </body>
    </html>
  );
}
