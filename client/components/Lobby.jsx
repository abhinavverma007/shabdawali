'use client';

import { useState } from 'react';
import LangToggle from './LangToggle';

const ROUND_OPTIONS = [3, 5, 8, 10];
const TIMER_OPTIONS = [20, 30, 45, 60];

function Choice({ label, options, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="text-base font-semibold">{label}</div>
      <div className="flex gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={value === o}
            onClick={() => onChange(o)}
            className={`min-h-[44px] min-w-[44px] rounded-xl px-2 text-lg font-bold ring-2 ring-stone-900 ${value === o ? 'bg-stone-900 text-white' : 'bg-white'}`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Lobby({ t, room, meId, onSettings, onStart, onLeave }) {
  const [copied, setCopied] = useState(false);
  const isHost = room.hostId === meId;
  const offline = room.players.filter((p) => !p.connected).length;
  const link = typeof window === 'undefined' ? '' : `${window.location.origin}/?room=${room.code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t.copyLink, link);
    }
  };

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${t.title} - ${t.roomCode}: ${room.code}\n${link}`)}`;

  return (
    <div className="flex flex-1 flex-col justify-center gap-2">
      <section className="card !p-3 text-center">
        <div className="text-sm font-semibold text-stone-600">{t.roomCode}</div>
        <div className="text-4xl font-extrabold leading-tight tracking-[0.2em] text-orange-700 sm:text-6xl" aria-live="polite">
          {room.code}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <button className="btn-secondary !min-h-[44px] !px-2 !text-base" onClick={copy}>
            {copied ? t.copied : t.copyLink}
          </button>
          <a className="btn-primary inline-flex !min-h-[44px] items-center justify-center !px-2 !text-base" href={whatsapp} target="_blank" rel="noreferrer">
            {t.whatsapp}
          </a>
        </div>
      </section>

      <section className="card !p-3">
        <h2 className="mb-2 text-base font-bold">
          {t.players} ({room.players.length}/10)
        </h2>
        {/* Two equal columns: ten names line up in five tidy rows instead of a ragged wrap. */}
        <ul className="grid grid-cols-2 gap-2">
          {room.players.map((p) => (
            <li
              key={p.id}
              className={`flex min-w-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-base font-semibold ${
                !p.connected
                  ? 'border-2 border-dashed border-stone-400 bg-stone-100 text-stone-600'
                  : p.away
                    ? 'bg-stone-100 text-stone-500'
                    : 'bg-amber-100'
              }`}
            >
              <span className="truncate">{p.name}</span>
              {p.id === meId && <span aria-label="you">★</span>}
              {p.id === room.hostId && (
                <span className="shrink-0" title={t.host} aria-label={t.host}>
                  👑
                </span>
              )}
              {p.connected && p.away && (
                <span className="shrink-0" title={t.away} aria-label={t.away}>
                  💤
                </span>
              )}
              {!p.connected && (
                <span className="shrink-0" title={t.reconnecting} aria-label={t.reconnecting}>
                  ⟳
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isHost ? (
        <section className="card flex flex-col gap-2 !p-3">
          <LangToggle compact lang={room.lang} onChange={(lang) => onSettings({ ...room.settings, lang })} label={t.language} />
          <Choice label={t.rounds} options={ROUND_OPTIONS} value={room.settings.rounds} onChange={(rounds) => onSettings({ ...room.settings, rounds })} />
          <Choice label={t.seconds} options={TIMER_OPTIONS} value={room.settings.timer} onChange={(timer) => onSettings({ ...room.settings, timer })} />
        </section>
      ) : (
        <p className="card !p-3 text-center text-lg font-semibold">
          {t.waitingHost}
          <span className="block text-base font-normal text-stone-600">
            {room.settings.rounds} {t.rounds} · {room.settings.timer} {t.seconds}
          </span>
        </p>
      )}

      {offline > 0 && (
        <p role="status" className="rounded-xl bg-amber-100 px-3 py-2 text-center text-base font-semibold text-amber-900">
          ⟳ {offline} {t.reconnectingNote}
        </p>
      )}

      <div className="flex gap-3">
        {isHost && (
          <button className="btn-primary !min-h-[48px] flex-1 !text-lg" onClick={onStart}>
            {t.startGame}
          </button>
        )}
        <button className={`btn-secondary !min-h-[48px] !text-lg ${isHost ? '' : 'flex-1'}`} onClick={onLeave}>
          {t.leave}
        </button>
      </div>
    </div>
  );
}
