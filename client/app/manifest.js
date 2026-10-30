// Lets the game be installed to the home screen, where it opens fullscreen with no browser bar.
export default function manifest() {
  return {
    name: 'शब्दावली · Word Scramble',
    short_name: 'शब्दावली',
    description: 'Hindi and English jumbled-words game for the whole family.',
    id: '/',
    lang: 'hi-IN',
    categories: ['games', 'education', 'entertainment'],
    start_url: '/',
    scope: '/',
    display: 'fullscreen',
    display_override: ['fullscreen', 'standalone'],
    background_color: '#fff8e7',
    theme_color: '#ea580c',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
