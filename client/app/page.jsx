import GameApp from '../components/GameApp';
import { buildMetadata } from '../lib/seo.mjs';

// The home page (Hindi). It reads nothing from the request, so Next builds it once and serves it from the CDN edge
// instead of running a server function on every visit. Shared room links (/?room=ABCD&lang=en) need a per-link
// preview, so middleware.js sends those to /join, the only dynamic page.
export const metadata = buildMetadata({ lang: 'hi', path: '/' });

export default function Page() {
  return <GameApp initialLang="hi" />;
}
