'use client';

import { useEffect, useRef, useState } from 'react';
import { rankPlayers } from '../lib/ranking.mjs';
import { bestKey, judgeScore, loadBest, saveBest } from '../lib/best.mjs';
import { feedback } from '../lib/sfx.mjs';

const PODIUM = [
  { place: 2, medal: '🥈', height: 'h-14 sm:h-28', bg: 'bg-stone-300' },
  { place: 1, medal: '🥇', height: 'h-20 sm:h-40', bg: 'bg-yellow-300' },
  { place: 3, medal: '🥉', height: 'h-10 sm:h-20', bg: 'bg-orange-300' },
];

export default function Results({ t, room, meId, names, leaderboard, history, onAgain, onSoloSettings, onLeave }) {
  const shown = (p) => names?.get(p.id) ?? p.name;
  const isHost = room.hostId === meId;
  const ranked = rankPlayers(leaderboard);
  // Players who walked away are listed after everyone who stayed, so they can never take a podium place.
  const active = ranked.filter((p) => !p.left);
  const gone = ranked.filter((p) => p.left);
  const me = ranked.find((p) => p.id === meId);

  // Solo summary: the score, whether it beats the personal best, and how each word went.
  const score = me?.score ?? 0;
  const rows = (history ?? []).map((h) => {
    const mine = h.results.find((r) => r.id === meId);
    return { word: h.word, solved: !!mine?.solved, timeMs: mine?.timeMs, points: mine?.points ?? 0 };
  });
  const total = rows.length || room.settings.rounds;
  const solvedCount = me?.solvedCount ?? rows.filter((r) => r.solved).length;
  const [bestInfo, setBestInfo] = useState(null);
  const judged = useRef(false);
  useEffect(() => {
    if (!room.solo || judged.current) return;
    judged.current = true;
    const key = bestKey(room.lang, room.settings.rounds, room.settings.timer);
    const verdict = judgeScore(loadBest(key), score);
    saveBest(key, verdict.best);
    setBestInfo(verdict);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Confetti is for a good result: a group game always, a solo game when it set a new best or got every word.
  const celebrate = !room.solo || (bestInfo !== null && (bestInfo.isNewBest || solvedCount === total));
  // The fanfare matches the confetti; a calmer two-note ending otherwise. Once, and only when the verdict is known.
  const ready = !room.solo || bestInfo !== null;
  const played = useRef(false);
  useEffect(() => {
    if (!ready || played.current) return;
    played.current = true;
    feedback(celebrate ? 'win' : 'end');
  }, [ready, celebrate]);

  useEffect(() => {
    if (!celebrate) return;
    let stopped = false;
    let confettiRef = null;
    // Celebration is decoration: if the chunk fails to load, the podium must still render.
    import('canvas-confetti')
      .then(({ default: confetti }) => {
        confettiRef = confetti;
        const end = Date.now() + 2500;
        (function frame() {
          if (stopped) return;
          confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0 } });
          confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1 } });
          if (Date.now() < end) requestAnimationFrame(frame);
        })();
      })
      .catch(() => {});
    return () => {
      stopped = true;
      confettiRef?.reset?.(); // clear any pieces still in the air so they do not drift into the next screen
    };
  }, [celebrate]);

  return (
    <div className="flex flex-1 flex-col justify-center gap-3">
      <h1 className="text-center text-3xl font-extrabold text-orange-700 sm:text-5xl">{t.gameOver}</h1>

      {room.solo ? (
        <section className="card flex flex-col gap-2 !p-3">
          <div className="text-center">
            <div className="text-base text-stone-600">{t.yourScore}</div>
            <div className="text-5xl font-extrabold leading-tight">{score}</div>
            {bestInfo?.isNewBest ? (
              <div className="text-lg font-bold text-green-700">{t.newBest}</div>
            ) : (
              bestInfo && (
                <div className="text-base text-stone-600">
                  {t.bestScore}: {bestInfo.best}
                </div>
              )
            )}
            <div className="mt-1 text-base font-semibold">
              {t.wordsSolved}: {solvedCount}/{total}
            </div>
          </div>
          {rows.length > 0 && (
            <ul className="flex flex-col gap-1">
              {rows.map((r, i) => (
                <li key={i} className={`grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 rounded-lg px-2 py-1.5 text-base ${r.solved ? 'bg-green-100' : 'bg-stone-100'}`}>
                  <span aria-hidden="true">{r.solved ? '✓' : '✗'}</span>
                  <span className="truncate font-semibold">{r.word}</span>
                  <span className="text-sm text-stone-700">{r.solved ? `${(r.timeMs / 1000).toFixed(1)}s +${r.points}` : t.noAnswer}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          <section className="flex items-end justify-center gap-3">
            {PODIUM.map(({ place, medal, height, bg }) => {
              const p = active[place - 1];
              if (!p) return <div key={place} className="min-w-0 flex-1" />;
              return (
                <div key={place} className="flex min-w-0 flex-1 flex-col items-center">
                  <div className="text-3xl sm:text-4xl">{medal}</div>
                  {/* The podium names are the headline: let them wrap to two lines instead of being cut short. */}
                  <div
                    title={p.name}
                    className={`line-clamp-2 w-full break-words rounded-lg px-1 text-center text-lg font-bold leading-tight sm:text-xl ${
                      p.id === meId ? 'bg-orange-100 ring-2 ring-orange-600' : ''
                    }`}
                  >
                    {shown(p)}
                  </div>
                  <div className={`flex w-full items-start justify-center rounded-t-2xl pt-1 text-xl font-extrabold sm:pt-2 sm:text-2xl ${height} ${bg}`}>{p.score}</div>
                </div>
              );
            })}
          </section>
          {/* The 4th place onwards: one full-width column. In two narrow columns names were cut to ~6 characters,
              which hid which "Kalpana" was which. Players who left come last, marked, with no rank. */}
          {(active.length > 3 || gone.length > 0) && (
            <ul className="card flex flex-col gap-1 !p-3">
              {active.slice(3).map((p, i) => (
                <li
                  key={p.id}
                  title={p.name}
                  className={`flex min-w-0 justify-between gap-2 rounded-lg px-2 py-1 text-base ${p.id === meId ? 'bg-orange-100 font-bold ring-2 ring-orange-600' : ''}`}
                >
                  <span className="truncate">
                    {i + 4}. {shown(p)}
                  </span>
                  <span className="font-bold">{p.score}</span>
                </li>
              ))}
              {gone.map((p) => (
                <li key={p.id} title={p.name} className="flex min-w-0 justify-between gap-2 rounded-lg px-2 py-1 text-base text-stone-500">
                  <span className="truncate">
                    {shown(p)} <span className="text-sm">({t.left})</span>
                  </span>
                  <span className="font-bold">{p.score}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {!isHost && <p className="text-center text-base font-semibold">{t.waitingRematch}</p>}
      {room.solo ? (
        // Same settings again with one tap, or open the settings first.
        <div className="flex flex-col gap-3">
          <button className="btn-primary !min-h-[48px] !text-lg" onClick={onAgain}>
            {t.playAgain}
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-secondary !min-h-[48px] !px-2 !text-lg" onClick={onSoloSettings}>
              {t.settings}
            </button>
            <button className="btn-secondary !min-h-[48px] !px-2 !text-lg" onClick={onLeave}>
              {t.leave}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          {isHost && (
            <button className="btn-primary !min-h-[48px] flex-1 !text-lg" onClick={onAgain}>
              {t.playAgain}
            </button>
          )}
          <button className={`btn-secondary !min-h-[48px] !text-lg ${isHost ? '' : 'flex-1'}`} onClick={onLeave}>
            {t.leave}
          </button>
        </div>
      )}
    </div>
  );
}
