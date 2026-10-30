import { SITE_URL } from '../lib/seo.mjs';

// Search engines may crawl everything except private room links (/?room=ABCD), which are short-lived and personal.
export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/*?room='] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
