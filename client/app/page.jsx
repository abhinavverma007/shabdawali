import GameApp from '../components/GameApp';
import { buildMetadata, cleanLang } from '../lib/seo.mjs';

// The home page (Hindi). A shared room link (/?room=ABCD&lang=en) gets a "join me" preview in WhatsApp and is
// kept out of search results; see buildMetadata.
export async function generateMetadata({ searchParams }) {
  const sp = (await searchParams) ?? {};
  return buildMetadata({ lang: cleanLang(sp.lang, 'hi'), room: sp.room, path: '/' });
}

export default async function Page({ searchParams }) {
  const sp = (await searchParams) ?? {};
  return <GameApp initialLang={cleanLang(sp.lang, 'hi')} />;
}
