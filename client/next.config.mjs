// NEXT_PUBLIC_* values are baked into the page at build time. If the server URL is missing on Vercel the
// site would build fine and then quietly try to reach localhost, so fail the build with a clear message instead.
if (process.env.VERCEL) {
  const url = process.env.NEXT_PUBLIC_SERVER_URL;
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_SERVER_URL is not set. In Vercel: Project Settings > Environment Variables, add it (all environments) ' +
        'with your Render URL, e.g. https://shabdawali-server.onrender.com, then redeploy.'
    );
  }
  if (!url.startsWith('https://')) {
    throw new Error(`NEXT_PUBLIC_SERVER_URL must start with https:// on Vercel (got "${url}"); browsers block insecure sockets from an https page.`);
  }
}

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  poweredByHeader: false,
};
