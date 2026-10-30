import { NextResponse } from 'next/server';

// Only runs for room links (/?room=ABCD, /en?room=ABCD); every other request skips it and is served as static files.
// A room link is rewritten (not redirected) to the dynamic /join page, so the visitor's address bar and the page's
// own scripts still see the original link, while the preview scraped by WhatsApp carries the room code.
export function middleware(request) {
  const url = request.nextUrl.clone();
  if (url.pathname === '/en') url.searchParams.set('lang', 'en');
  url.pathname = '/join';
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    { source: '/', has: [{ type: 'query', key: 'room' }] },
    { source: '/en', has: [{ type: 'query', key: 'room' }] },
  ],
};
