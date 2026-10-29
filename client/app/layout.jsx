import { Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import FullscreenOnTap from '../components/FullscreenOnTap';

const font = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-devanagari',
});

export const metadata = {
  title: 'शब्दावली · Word Scramble',
  description: 'Hindi and English jumbled-words game for the whole family.',
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
        <FullscreenOnTap />
        {children}
      </body>
    </html>
  );
}
