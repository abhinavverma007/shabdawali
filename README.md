# Shabdawali — Jumbled Words (Hindi & English)

- `server/` — Node + Express + Socket.io, in-memory rooms, word lists in `server/data/*.json`. Deploy on Render (`npm start`, set `CLIENT_ORIGIN`).
- `client/` — Next.js + Tailwind. Deploy on Vercel (set `NEXT_PUBLIC_SERVER_URL`).

## Run locally

```
cd server && npm install && npm start     # :4000
cd client && npm install && npm run dev    # :3000
```

Tests: `cd server && npm test`.

## Deploying

Deploy the **server first** (you need its URL for the client), then the client, then tell the server the client's URL.

**1. Render (server)**
1. Push this repo to GitHub.
2. Render: New → Blueprint → select the repo (it reads `render.yaml`), or create a Web Service by hand with root directory `server`, build `npm ci`, start `npm start`, health check path `/health`.
3. Environment variable `CLIENT_ORIGIN`: leave it for step 3 below. Copy the service URL, e.g. `https://shabdawali-server.onrender.com`.

**2. Vercel (client)**
1. Import the repo, set **Root Directory** to `client` (framework: Next.js, auto-detected).
2. Environment variable `NEXT_PUBLIC_SERVER_URL` = the Render URL (`https://…`), enabled for Production **and** Preview. It is baked in at build time, so changing it needs a redeploy. The build fails with a clear message if it is missing or not `https`.

**3. Back on Render**
Set `CLIENT_ORIGIN` to the Vercel URL, e.g. `https://shabdawali.vercel.app` (comma-separate several; a trailing slash is fine). To allow Vercel preview deployments too, add `https://shabdawali-*.vercel.app` (use your own project name; `*` matches one subdomain label). Render restarts the service; browsers from any other origin are refused.

**Check it:** open `<render-url>/health` → `{"ok":true}`, then open the Vercel site, create a room, and join from a second device.

**Things to know**
- **Run exactly one server instance.** Rooms live in memory; two instances would split players into separate worlds. Do not turn on autoscaling.
- **Restarts and deploys end running games.** Players are returned to the landing page with "Your last game has ended". Deploy when nobody is playing.
- **Render's free plan sleeps** after about 15 minutes with no traffic, and the next visitor waits roughly 30–60 seconds while it wakes. Before a family game, open `<render-url>/health` once, or use a paid plan.
- **Do not set `PORT`** on Render; it provides one.

## Link previews and search (SEO)

**Already in place**
- **WhatsApp / Facebook / Twitter previews:** every page has Open Graph and Twitter-card tags and a 1200x630 preview image (`client/public/og-image.png`). A shared room link previews as "Join my Shabdawali game! Room ABCD" and is kept out of search results.
- **Pages Google can index:** `/` (Hindi), `/en` (English), and a "how to play" page per language (`/how-to-play`, `/en/how-to-play`) with the rules, scoring and an FAQ, which is the real text a search engine ranks.
- **Technical SEO:** canonical addresses, hreflang pairs (Hindi/English), `robots.txt`, `sitemap.xml`, and structured data (WebSite, WebApplication/Game, Person, FAQPage).
- Metadata lives in `client/lib/seo.mjs` and the FAQ in `client/lib/faq.mjs`; change the text there. Keep the FAQ in step with the game.

**Environment variables (Vercel, all optional)**
- `NEXT_PUBLIC_SITE_URL`: your public address, e.g. `https://www.shabdawali.in`. Set it as soon as you have your own domain; until then the Vercel URL is used.
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` / `NEXT_PUBLIC_BING_SITE_VERIFICATION`: the verification codes from Search Console / Bing Webmaster Tools.

**What only you can do (this decides whether you rank)**
1. **Get your own domain** (e.g. shabdawali.in or .com). A `*.vercel.app` address ranks poorly and cannot build trust of its own. Add it in Vercel, then set `NEXT_PUBLIC_SITE_URL`.
2. **Google Search Console:** add the site, verify it, submit `/sitemap.xml`, then use "Request indexing" on `/`, `/en` and both how-to-play pages. Do the same in Bing Webmaster Tools.
3. **Get links to it.** Search engines rank sites other sites point to. Post it on your LinkedIn, in family WhatsApp groups, on Reddit (r/india, r/hindi), Product Hunt, and Indian parenting and education communities. A few real mentions beat any tag.
4. **Keep adding useful text.** More pages people search for (for example "Hindi word games for kids", "Antakshari-style word games") each give Google something to rank.
5. **Be patient.** A new site usually takes weeks to be indexed and months to rank for competitive phrases. Nothing in the code can guarantee a position.

**Checking previews**
- WhatsApp caches a link's preview for a long time. After changing the image or text, share the link with a new ending (`?v=2`) to see the new one, or test with Facebook's Sharing Debugger (developers.facebook.com/tools/debug), which also refreshes Facebook's copy.
- Run the Rich Results Test (search.google.com/test/rich-results) on `/en/how-to-play` to confirm the structured data.

## Refresh and reconnect

Each player gets a private token when they create or join a room; the browser keeps it in `localStorage` along with the room code. If the connection drops (refresh, closed tab, network blip) the seat is held for 45 seconds (`GRACE_MS` in `server/src/game.js`). On reconnect the browser sends `room:resume` and gets its seat, score, host role, solved state and hints back, plus the current round, round result or final standings. After the grace period, or after pressing Leave, the seat is released. The same player in a second tab takes the seat over from the first.

## Word lists

`server/data/hindi_words.json` and `english_words.json` hold 6,000 unique words each. Format: `{"w": "word", "c": "category hint"}`; an empty `c` means no category hint is offered for that word. The server splits Hindi into aksharas (tiles) and keeps words of 3–8 tiles. English tiers are easy (3–4 letters) / medium (5–6) / hard (7+). Hindi tiers are easy (3 tiles) / medium (4) / hard (5+), because an akshara tile is much bigger than a letter.

The lists were drafted and screened by AI (format, uniqueness, spelling against a dictionary for English, two review passes for familiarity) and **have not been checked by a native speaker**. A human pass is recommended, especially for Hindi: remove any word a child or grandparent would not know. `npm test` fails if a list stops being 6,000 unique, well-formed words, so edits stay safe.
