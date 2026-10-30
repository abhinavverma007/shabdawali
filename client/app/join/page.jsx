import GameApp from '../../components/GameApp';
import { buildMetadata, cleanLang } from '../../lib/seo.mjs';

// Where shared room links land (/?room=ABCD&lang=en is rewritten here by middleware.js, the address bar keeps the
// original link). It is the one dynamic page: the link preview in WhatsApp says which room the friend is inviting you
// to, and that needs the request. Everything else on the site is static.
export async function generateMetadata({ searchParams }) {
  const sp = (await searchParams) ?? {};
  const lang = cleanLang(sp.lang, 'hi');
  const meta = buildMetadata({ lang, room: sp.room, path: '/' });
  // Opened directly without a room code, this page must not compete with the real home page in search results.
  return sp.room ? meta : { ...meta, robots: { index: false, follow: false } };
}

export default async function JoinPage({ searchParams }) {
  const sp = (await searchParams) ?? {};
  return <GameApp initialLang={cleanLang(sp.lang, 'hi')} />;
}
