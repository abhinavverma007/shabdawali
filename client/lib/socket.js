import { io } from 'socket.io-client';

// Baked in at build time. Trailing slashes are stripped so https://x.onrender.com/ works too.
const URL = (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000').replace(/\/+$/, '');

let socket;
export function getSocket() {
  if (!socket) socket = io(URL, { autoConnect: true, transports: ['websocket', 'polling'] });
  return socket;
}

// Resolves with the ack, or {error:'connection'} if the server does not answer.
export function emitAck(event, payload, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ error: 'connection' }), timeoutMs);
    getSocket().emit(event, payload, (res) => {
      clearTimeout(timer);
      resolve(res ?? {});
    });
  });
}
