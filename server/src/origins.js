// Which browser origins may talk to this server (CLIENT_ORIGIN, comma separated).
// Forgiving about a trailing slash, and a `*` stands for one subdomain label so Vercel preview URLs
// can be allowed with e.g. https://shabdawali-*.vercel.app (it never matches dots or slashes).

export function parseOrigins(value) {
  return String(value ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

const escape = (s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

export function isAllowedOrigin(origin, allowed) {
  if (!origin) return true; // not a browser (health checks, curl, server-to-server)
  const clean = origin.replace(/\/+$/, '');
  return allowed.some((entry) => {
    if (!entry.includes('*')) return entry === clean;
    const pattern = entry.split('*').map(escape).join('[a-z0-9-]+');
    return new RegExp(`^${pattern}$`, 'i').test(clean);
  });
}

// Shape expected by both the `cors` package and Socket.io.
export function originChecker(allowed) {
  return (origin, callback) => callback(null, isAllowedOrigin(origin, allowed));
}
