import GameApp from '../../components/GameApp';
import { buildMetadata } from '../../lib/seo.mjs';

// The English entry point: its own address, title and description, so people searching in English find an English page.
export async function generateMetadata({ searchParams }) {
  const sp = (await searchParams) ?? {};
  return buildMetadata({ lang: 'en', room: sp.room, path: '/en' });
}

export default function EnglishPage() {
  return <GameApp initialLang="en" />;
}
