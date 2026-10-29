'use client';

import { useEffect } from 'react';

const PODIUM = [
  { place: 2, medal: '🥈', height: 'h-14 sm:h-28', bg: 'bg-stone-300' },
  { place: 1, medal: '🥇', height: 'h-20 sm:h-40', bg: 'bg-yellow-300' },
  { place: 3, medal: '🥉', height: 'h-10 sm:h-20', bg: 'bg-orange-300' },
];

export default function Results({ t, room, meId, names, leaderboard, onAgain, onLeave }) {
  const shown = (p) => names?.get(p.id) ?? p.name;
  const isHost = room.hostId === meId;
  const me = leaderboard.find((p) => p.id === meId);

  useEffect(() => {
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
  }, []);

  return (
    <div className="flex flex-1 flex-col justify-center gap-3">
      <h1 className="text-center text-3xl font-extrabold text-orange-700 sm:text-5xl">{t.gameOver}</h1>

      {room.solo ? (
        <p className="card text-center text-3xl font-bold">
          {t.yourScore}: {me?.score ?? 0}
        </p>
      ) : (
        <>
          <section className="flex items-end justify-center gap-3">
            {PODIUM.map(({ place, medal, height, bg }) => {
              const p = leaderboard[place - 1];
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
              which hid which "Kalpana" was which. */}
          {leaderboard.length > 3 && (
            <ul className="card flex flex-col gap-1 !p-3">
              {leaderboard.slice(3).map((p, i) => (
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
            </ul>
          )}
        </>
      )}

      {!isHost && <p className="text-center text-base font-semibold">{t.waitingRematch}</p>}
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
    </div>
  );
}
