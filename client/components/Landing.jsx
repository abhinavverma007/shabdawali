'use client';

import { useEffect, useRef, useState } from 'react';
import LangToggle from './LangToggle';
import InstallHint from './InstallHint';

export default function Landing({ t, lang, setLang, name, setName, error, onCreate, onJoin, onSolo }) {
  const [code, setCode] = useState('');
  const [nameMissing, setNameMissing] = useState(false);
  const nameRef = useRef(null);

  const withName = (action) => () => {
    if (!name.trim()) {
      setNameMissing(true);
      nameRef.current?.focus();
      return;
    }
    action();
  };

  // Links shared from the lobby look like /?room=B4K2
  useEffect(() => {
    const shared = new URLSearchParams(window.location.search).get('room');
    if (shared) setCode(shared.toUpperCase().slice(0, 4));
  }, []);

  // Restore what the person typed before the page finished loading (see the capture script in layout.jsx).
  useEffect(() => {
    const typed = window.__prefill;
    if (!typed) return;
    if (typed.name) setName(typed.name);
    if (typed.code) setCode(typed.code.toUpperCase().slice(0, 4));
    window.__prefill = undefined;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const message = nameMissing ? t.nameRequired : error;

  return (
    <div className="flex flex-1 flex-col justify-center gap-3">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold leading-tight text-orange-700 sm:text-5xl">{t.title}</h1>
          <p className="text-base text-stone-700 sm:text-xl">{t.tagline}</p>
        </div>
        <LangToggle lang={lang} onChange={setLang} label={t.language} />
      </header>

      <section className="card flex flex-col gap-3 !p-4">
        <label className="flex flex-col gap-1 text-base font-semibold">
          {t.yourName}
          <input
            ref={nameRef}
            data-prefill="name"
            className={`input !min-h-[48px] !text-lg ${nameMissing ? '!border-red-700 ring-2 ring-red-700' : ''}`}
            value={name}
            maxLength={30}
            aria-invalid={nameMissing}
            onChange={(e) => {
              setName(e.target.value);
              if (e.target.value.trim()) setNameMissing(false);
            }}
            autoComplete="nickname"
          />
        </label>

        {message && (
          <p role="alert" className="rounded-xl bg-red-100 px-3 py-2 text-base font-semibold text-red-900">
            {message}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button className="btn-primary !min-h-[48px] !px-2 !text-[17px] whitespace-nowrap" onClick={withName(onCreate)}>
            {t.createRoom}
          </button>
          <button className="btn-secondary !min-h-[48px] !px-2 !text-[17px] whitespace-nowrap" onClick={withName(onSolo)}>
            {t.playSolo}
          </button>
        </div>

        <hr className="border-stone-200" />

        <div className="text-base font-semibold">{t.joinRoom}</div>
        <div className="flex gap-3">
          <input
            className="input !min-h-[48px] min-w-0 text-center !text-2xl font-extrabold uppercase tracking-[0.3em]"
            aria-label={t.roomCode}
            data-prefill="code"
            value={code}
            maxLength={4}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button
            className="btn-primary !min-h-[48px] shrink-0 !px-5 !text-lg"
            disabled={code.length !== 4}
            onClick={withName(() => onJoin(code))}
          >
            {t.join}
          </button>
        </div>
      </section>

      <InstallHint t={t} />
    </div>
  );
}
