import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { GameManager } from './game.js';
import { parseOrigins, originChecker } from './origins.js';

const PORT = process.env.PORT || 4000;
const ORIGINS = parseOrigins(process.env.CLIENT_ORIGIN || 'http://localhost:3000');
if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_ORIGIN) {
  console.warn('CLIENT_ORIGIN is not set: browsers on your deployed site will be blocked. Set it to your Vercel URL.');
}

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: originChecker(ORIGINS) }));
app.get('/', (_req, res) => res.type('text').send('shabdawali server is running'));
app.get('/health', (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: originChecker(ORIGINS) },
  // Every message in this game is a few hundred bytes; refuse anything much larger.
  maxHttpBufferSize: 10_000,
});
const games = new GameManager(io);

io.on('connection', (socket) => {
  // One bad message must not take every running game down with it.
  const on = (event, handler) =>
    socket.on(event, (...args) => {
      try {
        handler(...args);
      } catch (err) {
        console.error(`handler for "${event}" failed:`, err);
        const ack = args.at(-1);
        if (typeof ack === 'function') ack({ error: 'server_error' });
      }
    });

  // Acks carry the player's private token so the browser can reclaim its seat after a refresh.
  on('room:create', (payload, ack) => {
    const room = games.createRoom(socket, payload ?? {});
    games.broadcast(room);
    ack?.({ code: room.code, token: games.tokenOf(socket) });
  });

  on('room:join', (payload, ack) => {
    const result = games.joinRoom(socket, payload ?? {});
    ack?.(result.error ? { error: result.error } : { code: result.room.code, token: games.tokenOf(socket) });
  });

  on('solo:start', (payload, ack) => {
    const room = games.createRoom(socket, { ...(payload ?? {}), solo: true });
    ack?.({ code: room.code, token: games.tokenOf(socket) });
    games.startGame(socket);
  });

  on('presence:away', (payload, ack) => {
    games.setAway(socket, !!payload?.away);
    ack?.({ ok: true });
  });

  on('room:resume', (payload, ack) => ack?.(games.resume(socket, payload ?? {})));

  on('room:settings', (payload) => games.setSettings(socket, payload ?? {}));
  on('game:start', () => games.startGame(socket));
  on('game:again', () => games.playAgain(socket));
  on('answer:submit', (payload, ack) => ack?.(games.submitAnswer(socket, payload?.answer)));
  on('hint:request', (payload, ack) => ack?.(games.requestHint(socket, payload?.type)));
  on('room:leave', () => games.leave(socket));
  on('disconnect', () => games.disconnect(socket));
});

process.on('unhandledRejection', (err) => console.error('unhandled rejection:', err));

server.listen(PORT, () => console.log(`shabdawali server listening on :${PORT} (allowed origins: ${ORIGINS.join(', ') || 'none'})`));

// Render sends SIGTERM on every deploy/restart: stop accepting connections and let the process end cleanly.
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down');
  io.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
});
