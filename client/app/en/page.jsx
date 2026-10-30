import GameApp from '../../components/GameApp';
import { buildMetadata } from '../../lib/seo.mjs';

// The English entry point: its own address, title and description, so people searching in English find an English page.
// Static like the Hindi home page; English room links are handled by /join (see middleware.js).
export const metadata = buildMetadata({ lang: 'en', path: '/en' });

export default function EnglishPage() {
  return <GameApp initialLang="en" />;
}
