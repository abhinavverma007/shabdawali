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

## Refresh and reconnect

Each player gets a private token when they create or join a room; the browser keeps it in `localStorage` along with the room code. If the connection drops (refresh, closed tab, network blip) the seat is held for 45 seconds (`GRACE_MS` in `server/src/game.js`). On reconnect the browser sends `room:resume` and gets its seat, score, host role, solved state and hints back, plus the current round, round result or final standings. After the grace period, or after pressing Leave, the seat is released. The same player in a second tab takes the seat over from the first.

## Word lists

`server/data/hindi_words.json` and `english_words.json` hold 5,000 unique words each. Format: `{"w": "word", "c": "category hint"}`; an empty `c` means no category hint is offered for that word. The server splits Hindi into aksharas (tiles) and keeps words of 3–8 tiles. English tiers are easy (3–4 letters) / medium (5–6) / hard (7+). Hindi tiers are easy (3 tiles) / medium (4) / hard (5+), because an akshara tile is much bigger than a letter.

The lists were drafted and screened by AI (format, uniqueness, spelling against a dictionary for English, two review passes for familiarity) and **have not been checked by a native speaker**. A human pass is recommended, especially for Hindi: remove any word a child or grandparent would not know. `npm test` fails if a list stops being 5,000 unique, well-formed words, so edits stay safe.
