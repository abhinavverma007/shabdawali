'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { STRINGS } from '../lib/i18n';
import { getSocket, emitAck } from '../lib/socket';
import { saveSession, loadSession, clearSession } from '../lib/session';
import { displayNames } from '../lib/names.mjs';
import Landing from '../components/Landing';
import Lobby from '../components/Lobby';
import Game from '../components/Game';
import Results from '../components/Results';
import Footer from '../components/Footer';
import Toast from '../components/Toast';

export default function Home() {
  const [lang, setLang] = useState('hi');
  const [name, setName] = useState('');
  const [room, setRoom] = useState(null);
  const [round, setRound] = useState(null);
  const [result, setResult] = useState(null);
  const [final, setFinal] = useState(null);
  const [error, setError] = useState('');
  const [meId, setMeId] = useState(null);
  const [resuming, setResuming] = useState(false);
  const [toasts, setToasts] = useState([]);
  const hadRoom = useRef(false);
  const inRoom = useRef(false);

  // Inside a room the room's language wins, so everyone sees the same words and labels.
  // Short names for tight spaces; computed from the whole roster so players with the same first name stay distinct.
  const names = useMemo(() => displayNames(room?.players ?? []), [room?.players]);
  const uiLang = room?.lang ?? lang;
  const t = STRINGS[uiLang];
  // The notice handler is registered once, so it reads the current language and names through refs.
  const uiLangRef = useRef(uiLang);
  const namesRef = useRef(names);
  uiLangRef.current = uiLang;
  namesRef.current = names;

  const addToast = (text) => {
    const id = Math.random();
    setToasts((list) => [...list.slice(-2), { id, text }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 4500);
  };

  // A shared link carries the room's language (?lang=en), so a guest does not land on a page in the wrong language.
  useEffect(() => {
    try {
      const l = new URLSearchParams(window.location.search).get('lang');
      if (l === 'en' || l === 'hi') setLang(l);
    } catch {}
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const resetScreen = () => {
      setRoom(null);
      setRound(null);
      setResult(null);
      setFinal(null);
    };

    // Runs on the first connect and on every automatic reconnect (refresh, network blip, sleeping phone):
    // if this browser holds a seat, ask the server to hand it back.
    const onConnect = () => {
      setMeId(socket.id);
      const saved = loadSession();
      if (!saved) return;
      setResuming(true);
      emitAck('room:resume', saved).then((res) => {
        setResuming(false);
        if (res.error === 'resume_failed') {
          clearSession();
          resetScreen();
          setError('resume_failed');
        } else if (document.hidden) {
          socket.emit('presence:away', { away: true });
        }
      });
    };
    const onState = (s) => setRoom(s);
    const onRound = (r) => {
      setResult(null);
      setFinal(null);
      setRound({ ...r, localEndsAt: Date.now() + (r.remainingMs ?? r.durationMs) });
    };
    const onResult = (r) => setResult({ ...r, receivedAt: Date.now() });
    const onEnd = (e) => setFinal(e);
    const onConnectError = () => setError('connection');
    // The same player opened the game in another tab; that tab owns the seat now. Keep the stored session for it.
    const onTaken = () => resetScreen();
    // Things that happen to the room: someone left (and who hosts now), the host changed the language.
    const onNotice = (n) => {
      const tt = STRINGS[uiLangRef.current];
      const nm = namesRef.current;
      if (n.type === 'left') {
        let text = tt.noticeLeft(nm.get(n.id) ?? n.name);
        if (n.newHostId) text += ' · ' + tt.noticeHost(nm.get(n.newHostId) ?? n.newHostName);
        addToast(text);
      } else if (n.type === 'lang') {
        // Said in the new language, the one the room is using from now on.
        addToast(STRINGS[n.lang].noticeLang(n.lang === 'hi' ? 'हिन्दी' : 'English'));
      }
    };
    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('room:state', onState);
    socket.on('round:start', onRound);
    socket.on('round:result', onResult);
    socket.on('game:end', onEnd);
    socket.on('session:taken', onTaken);
    socket.on('room:notice', onNotice);
    if (socket.connected) onConnect();
    return () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('room:state', onState);
      socket.off('round:start', onRound);
      socket.off('round:result', onResult);
      socket.off('game:end', onEnd);
      socket.off('session:taken', onTaken);
      socket.off('room:notice', onNotice);
    };
  }, []);

  useEffect(() => {
    inRoom.current = !!room;
  }, [room]);

  // Tell the others the moment this page is hidden (switched app or tab), and on return make sure the
  // connection is alive right away instead of waiting for the automatic retry. A phone that slept can
  // be left with a half-dead connection that still looks connected.
  useEffect(() => {
    const socket = getSocket();
    const onVisibility = async () => {
      if (!inRoom.current) return;
      if (document.hidden) {
        socket.emit('presence:away', { away: true });
        return;
      }
      if (!socket.connected) {
        socket.connect();
        return;
      }
      const res = await emitAck('presence:away', { away: false }, 2000);
      if (res.error) {
        socket.disconnect();
        socket.connect();
      }
    };
    const onOnline = () => {
      if (inRoom.current && !socket.connected) socket.connect();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  // Keep the room code in the address bar so the page can be reloaded or bookmarked.
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (room?.code) {
        url.searchParams.set('room', room.code);
        hadRoom.current = true;
      } else if (hadRoom.current) {
        url.searchParams.delete('room');
        hadRoom.current = false;
      } else return;
      window.history.replaceState(null, '', url);
    } catch {}
  }, [room?.code]);

  const guard = async (event, payload) => {
    setError('');
    const res = await emitAck(event, payload);
    if (res.error) setError(res.error);
    else if (res.token && res.code) saveSession({ code: res.code, token: res.token });
    return res;
  };

  const leave = () => {
    getSocket().emit('room:leave');
    clearSession();
    setRoom(null);
    setRound(null);
    setResult(null);
    setFinal(null);
  };

  const errorText = error && (t.errors[error] ?? t.errors.connection);

  // After a refresh between rounds there is a result to show but no round object yet; the header only needs the numbers.
  const gameRound =
    round ??
    (result
      ? { round: result.round, totalRounds: result.totalRounds, durationMs: 1, tiles: [], length: 0, localEndsAt: 0, hasCategory: false }
      : null);

  const inGame = room && (room.phase === 'round' || room.phase === 'between');

  let screen;
  if (!room && resuming) {
    screen = <p className="m-auto text-center text-3xl font-bold text-orange-700">…</p>;
  } else if (!room) {
    screen = (
      <Landing
        t={t}
        lang={lang}
        setLang={setLang}
        name={name}
        setName={setName}
        error={errorText}
        onCreate={() => guard('room:create', { name, lang })}
        onJoin={(code) => guard('room:join', { name, code })}
        onSolo={() => guard('solo:start', { name, lang })}
      />
    );
  } else if (room.phase === 'lobby') {
    screen = (
      <Lobby
        t={t}
        room={room}
        meId={meId}
        names={names}
        onSettings={(s) => getSocket().emit('room:settings', s)}
        onStart={() => getSocket().emit('game:start')}
        onLeave={leave}
      />
    );
  } else if (room.phase === 'ended') {
    screen = (
      <Results
        t={t}
        room={room}
        meId={meId}
        names={names}
        leaderboard={final?.leaderboard ?? [...room.players].sort((a, b) => b.score - a.score)}
        history={final?.history}
        onAgain={() => getSocket().emit('game:again')}
        onSoloSettings={() => getSocket().emit('game:again', { toLobby: true })}
        onLeave={leave}
      />
    );
  } else {
    screen = (
      <Game
        key={gameRound?.round}
        t={t}
        room={room}
        meId={meId}
        names={names}
        round={gameRound}
        result={room.phase === 'between' ? result : null}
        onNext={() => getSocket().emit('round:skip')}
        onLeave={leave}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full min-w-0 max-w-2xl flex-col overflow-x-hidden px-4 py-4">
      <Toast toasts={toasts} />
      {screen}
      {/* Hidden while a game is running so the puzzle keeps every pixel of the screen. */}
      {!inGame && <Footer />}
    </main>
  );
}
