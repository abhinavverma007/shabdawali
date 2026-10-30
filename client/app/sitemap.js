import { SITE_URL } from '../lib/seo.mjs';

// Every public page, with its language twin, so Google can pair the Hindi and English versions.
export default function sitemap() {
  const lastModified = new Date();
  const languages = (hi, en) => ({ 'hi-IN': `${SITE_URL}${hi}`, 'en-IN': `${SITE_URL}${en}` });
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: 'weekly', priority: 1, alternates: { languages: languages('/', '/en') } },
    { url: `${SITE_URL}/en`, lastModified, changeFrequency: 'weekly', priority: 0.9, alternates: { languages: languages('/', '/en') } },
    { url: `${SITE_URL}/how-to-play`, lastModified, changeFrequency: 'monthly', priority: 0.8, alternates: { languages: languages('/how-to-play', '/en/how-to-play') } },
    { url: `${SITE_URL}/en/how-to-play`, lastModified, changeFrequency: 'monthly', priority: 0.8, alternates: { languages: languages('/how-to-play', '/en/how-to-play') } },
  ];
}
