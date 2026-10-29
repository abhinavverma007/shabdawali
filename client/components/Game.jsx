'use client';

import { useEffect, useRef, useState } from 'react';
import { emitAck } from '../lib/socket';
import { rankPlayers } from '../lib/ranking.mjs';
import ConfirmDialog from './ConfirmDialog';

// How long the "Well done! +N" screen stays up when solving the word is what ended the round. Alone, solving always
// ends the round at once, so without this hold the celebration was replaced by the result before it could be seen.
const SOLVED_HOLD_MS = 1500;

function useCountdown(endsAt) {
  const [ms, setMs] = useState(() => Math.max(0, (endsAt ?? 0) - Date.now()));
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setMs(Math.max(0, endsAt - Date.now()));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [endsAt]);
  return ms;
}

// Tile indices that spell the player's already-solved word, or an empty set of slots.
function arrangement(round) {
  const length = round?.length ?? 0;
  const answer = round?.resume?.solved ? round.resume.answer : null;
  if (!answer) return Array(length).fill(null);
  const taken = new Set();
  return answer.map((unit) => {
    const i = round.tiles.findIndex((tile, idx) => tile === unit && !taken.has(idx));
    if (i >= 0) taken.add(i);
    return i >= 0 ? i : null;
  });
}

const MEDALS = ['🥇', '🥈', '🥉'];

// Live standings. The collapsed view is always exactly ONE fixed-height row (the leader, plus you, or the
// runner-up if you lead) so nothing below it ever moves while other players score. Tapping the row opens the full
// list in two columns underneath. The whole row is the tap target, so no separate button takes room from the names.
// Players who have left are shown last, marked, and never count as the leader.
function LiveBoard({ t, players, meId, names }) {
  const [open, setOpen] = useState(false);
  const ranked = rankPlayers(players);
  const active = ranked.filter((p) => !p.left);
  const leader = active[0];
  const me = ranked.find((p) => p.id === meId);
  const second = me && !me.left && me.id !== leader?.id ? me : active[1];
  const headline = [leader, second].filter(Boolean);
  const expandable = ranked.length > 2;
  // Medals only once someone has points, so a 0-0 start shows none.
  const badge = (p) => (p.left || p.rank == null || p.score <= 0 ? '' : (MEDALS[p.rank - 1] ?? `${p.rank}.`));

  // In the one-row summary the leader's medal is left out (first place is obvious) so the names get the room;
  // you still see your own rank when you are behind.
  const chip = (p, summary = false) => (
    <li
      key={p.id}
      aria-label={`${p.name} ${p.score}${p.solved ? ' ✓' : ''}${p.left ? ` (${t.left})` : ''}`}
      className={`flex min-w-0 items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ${
        p.solved && !p.left ? 'bg-green-200' : 'bg-white ring-1 ring-stone-300'
      } ${p.id === meId ? '!ring-2 ring-orange-600' : ''} ${p.connected && !p.away && !p.left ? '' : 'opacity-50'}`}
    >
      {badge(p) && (!summary || (p.id === meId && p.rank > 1)) && <span className="shrink-0">{badge(p)}</span>}
      <span className="truncate">{names?.get(p.id) ?? p.name}</span>
      {p.left && <span className="shrink-0 text-xs font-normal">{t.left}</span>}
      <span className="shrink-0 font-bold">{p.score}</span>
    </li>
  );

  return (
    <section aria-label={t.leaderboard} className="flex flex-col gap-1.5">
      <div
        role={expandable ? 'button' : undefined}
        tabIndex={expandable ? 0 : undefined}
        aria-expanded={expandable ? open : undefined}
        onClick={() => expandable && setOpen((o) => !o)}
        onKeyDown={(e) => expandable && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpen((o) => !o))}
        className={`flex h-9 items-center gap-1.5 ${expandable ? 'cursor-pointer' : ''}`}
      >
        {open ? (
          <span className="min-w-0 flex-1 px-1 text-base font-bold">{t.leaderboard}</span>
        ) : (
          // No fixed 50/50 split: the two chips share the row by their content, so only the longer name gives up space.
          <ul className="flex min-w-0 flex-1 gap-1.5">{headline.map((p) => chip(p, true))}</ul>
        )}
        {expandable && (
          <span aria-hidden="true" className="shrink-0 px-1 text-lg text-stone-700">
            {open ? '▴' : '▾'}
          </span>
        )}
      </div>
      {open && <ul className="grid grid-cols-2 gap-1.5">{ranked.map((p) => chip(p))}</ul>}
    </section>
  );
}

// Playing alone there is nobody to rank against, so the row shows your own progress instead.
function SoloRow({ t, me, total }) {
  return (
    <div className="flex h-9 items-center gap-3">
      <span className="rounded-full bg-white px-3 py-1 text-base font-bold ring-1 ring-stone-300">
        🏆 {t.scoreWord} {me?.score ?? 0}
      </span>
      <span className="text-base font-semibold text-stone-600">
        ✓ {me?.solvedCount ?? 0}/{total}
      </span>
    </div>
  );
}

// One compact table for the end of a round: who got it and how fast, plus the running total.
function RoundResult({ t, result, meId, names, solo, onNext }) {
  const ms = useCountdown(result.receivedAt + result.nextInMs);
  const thisRound = new Map(result.results.map((r) => [r.id, r]));
  const rows = rankPlayers(result.leaderboard);
  return (
    <section className="card flex flex-col gap-2 !p-3">
      <div className="text-center">
        <div className="text-base text-stone-600">{t.answerWas}</div>
        <div className="text-4xl font-extrabold leading-tight text-orange-700">{result.word}</div>
      </div>
      <ul className="flex flex-col gap-1">
        {rows.map((p) => {
          const r = thisRound.get(p.id);
          return (
            <li
              key={p.id}
              className={`grid grid-cols-[1.75rem_1fr_auto_3rem] items-center gap-2 rounded-lg px-2 py-1.5 text-base ${
                p.left ? 'bg-stone-100 opacity-60' : r?.solved ? 'bg-green-100' : 'bg-stone-100'
              } ${p.id === meId ? 'ring-2 ring-orange-600' : ''}`}
            >
              <span className="font-bold">{p.rank == null ? '' : (MEDALS[p.rank - 1] ?? p.rank)}</span>
              <span className="truncate font-semibold">{names?.get(p.id) ?? p.name}</span>
              <span className="text-sm text-stone-700">
                {p.left ? t.left : r?.solved ? `${(r.timeMs / 1000).toFixed(1)}s +${r.points}` : t.noAnswer}
              </span>
              <span className="text-right font-bold">{p.score}</span>
            </li>
          );
        })}
      </ul>
      {solo ? (
        // Alone, nobody else needs the pause: let the player move on when ready.
        <button className="btn-primary !min-h-[48px] !text-lg" onClick={onNext}>
          {t.next} ({Math.ceil(ms / 1000)})
        </button>
      ) : (
        <p className="text-center text-base text-stone-600">
          {t.nextRound}: {Math.ceil(ms / 1000)}
        </p>
      )}
    </section>
  );
}

export default function Game({ t, room, meId, names, round, result, onNext, onLeave }) {
  const tiles = round?.tiles ?? [];
  const length = round?.length ?? 0;
  // After a refresh the server re-sends what this player had already done in the round.
  const resume = round?.resume;
  const [slots, setSlots] = useState(() => arrangement(round));
  const [status, setStatus] = useState(resume?.solved ? 'solved' : 'playing'); // playing | wrong | solved
  const [earned, setEarned] = useState(resume?.points ?? 0);
  const [hints, setHints] = useState(resume?.hints ?? {});
  const [shakeKey, setShakeKey] = useState(0);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [, rerender] = useState(0);
  const solvedAt = useRef(0);
  const submitting = useRef(false);
  const remaining = useCountdown(round?.localEndsAt);

  useEffect(() => {
    if (!resume?.solved) setSlots(Array(length).fill(null));
  }, [length]); // eslint-disable-line react-hooks/exhaustive-deps

  // If solving the word is what ended the round, keep the "Well done" screen up a moment before the result replaces it.
  const holdMs = result ? Math.max(0, solvedAt.current + SOLVED_HOLD_MS - Date.now()) : 0;
  useEffect(() => {
    if (!result || !holdMs) return;
    const id = setTimeout(() => rerender((n) => n + 1), holdMs + 20);
    return () => clearTimeout(id);
  }, [result]); // eslint-disable-line react-hooks/exhaustive-deps
  const showResult = !!result && holdMs === 0;

  const locked = status === 'solved' || !!result;
  const used = new Set(slots.filter((s) => s !== null));

  const place = (tile, slotIdx) => {
    if (locked) return;
    setStatus('playing');
    setSlots((prev) => {
      const next = prev.map((s) => (s === tile ? null : s));
      const target = slotIdx ?? next.indexOf(null);
      if (target === -1) return prev;
      next[target] = tile;
      return next;
    });
  };

  const remove = (slotIdx) => {
    if (locked) return;
    setStatus('playing');
    setSlots((prev) => prev.map((s, i) => (i === slotIdx ? null : s)));
  };

  useEffect(() => {
    if (!length || slots.some((s) => s === null) || locked || submitting.current) return;
    submitting.current = true;
    emitAck('answer:submit', { answer: slots.map((i) => tiles[i]) }).then((res) => {
      submitting.current = false;
      if (res.correct) {
        solvedAt.current = Date.now();
        setEarned(res.points ?? 0);
        setStatus('solved');
      } else {
        setStatus('wrong');
        setShakeKey((k) => k + 1);
      }
    });
  }, [slots]); // eslint-disable-line react-hooks/exhaustive-deps

  const askHint = async (type) => {
    const res = await emitAck('hint:request', { type });
    if (res?.value) setHints((h) => ({ ...h, [type]: res.value }));
  };

  if (!round) return <p className="text-center text-2xl">…</p>;

  // Once the round is over the clock stops: it used to keep counting down on the result screen.
  const left = result ? 0 : remaining;
  const pct = Math.round((left / round.durationMs) * 100);
  const low = left > 0 && left <= 5000;
  const active = room.players.filter((p) => !p.left);
  const solvedNow = active.filter((p) => p.solved).length;
  const me = room.players.find((p) => p.id === meId);

  return (
    // Top-aligned, so the puzzle stays put under the player's finger instead of drifting as the screen changes.
    // Alone there is no changing board above the puzzle, so it can sit a little lower, nearer the middle.
    <div className={`flex flex-1 flex-col justify-start gap-2 ${room.solo ? 'pt-[8dvh]' : 'pt-2'}`}>
      <header className="flex items-center justify-between text-lg font-bold">
        <span>
          {t.round} {round.round}/{round.totalRounds}
          {!room.solo && <span className="ml-2 text-sm font-semibold text-stone-600">✓ {solvedNow}/{active.length}</span>}
        </span>
        <span className={low ? 'text-red-700' : ''} aria-live="off">
          ⏱ {Math.ceil(left / 1000)}
        </span>
        <button className="text-base font-semibold underline" onClick={() => setConfirmLeave(true)}>
          {t.leave}
        </button>
      </header>
      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full transition-all ${low ? 'bg-red-600' : 'bg-orange-600'}`} style={{ width: `${pct}%` }} />
      </div>

      {showResult ? (
        <RoundResult t={t} result={result} meId={meId} names={names} solo={room.solo} onNext={onNext} />
      ) : (
        <>
          {room.solo ? <SoloRow t={t} me={me} total={round.totalRounds} /> : <LiveBoard t={t} players={room.players} meId={meId} names={names} />}

          <section key={shakeKey} className={`card flex flex-col items-center gap-3 !p-3 ${status === 'wrong' ? 'shake' : ''}`}>
            <div className="flex flex-wrap justify-center gap-2" aria-label="answer">
              {slots.map((tile, k) => (
                <button
                  key={k}
                  type="button"
                  disabled={locked}
                  onClick={() => tile !== null && remove(k)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dragged = Number(e.dataTransfer.getData('text/plain'));
                    if (!Number.isNaN(dragged)) place(dragged, k);
                  }}
                  draggable={tile !== null && !locked}
                  onDragStart={(e) => tile !== null && e.dataTransfer.setData('text/plain', String(tile))}
                  className={`flex h-14 min-w-[3rem] items-center justify-center rounded-xl border-4 px-2 text-2xl font-extrabold sm:h-20 sm:min-w-[4.5rem] sm:px-3 sm:text-4xl ${
                    tile === null
                      ? 'border-dashed border-stone-400 bg-stone-50'
                      : status === 'solved'
                        ? 'border-green-700 bg-green-100'
                        : status === 'wrong'
                          ? 'border-red-700 bg-red-50'
                          : 'border-stone-900 bg-amber-100'
                  }`}
                >
                  {tile === null ? '' : tiles[tile]}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-2" aria-label="letters">
              {tiles.map((letter, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={locked || used.has(i)}
                  draggable={!locked && !used.has(i)}
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', String(i))}
                  onClick={() => place(i)}
                  className={`flex h-14 min-w-[3rem] items-center justify-center rounded-xl bg-orange-600 px-2 text-2xl font-extrabold text-white shadow-md active:scale-95 sm:h-20 sm:min-w-[4.5rem] sm:px-3 sm:text-4xl ${
                    used.has(i) ? 'invisible' : ''
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>

            <p role="status" className="min-h-[1.75rem] text-xl font-bold">
              {status === 'wrong' && <span className="text-red-700">{t.wrong}</span>}
              {status === 'solved' && (
                <span className="text-green-800">
                  {t.correct} +{earned} {t.points}
                </span>
              )}
            </p>
          </section>

          {!locked && (
            <div className="flex flex-col gap-2">
              <div className={`grid gap-2 ${round.hasCategory ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <button className="btn-secondary !min-h-[44px] !px-1.5 !text-[15px] whitespace-nowrap" onClick={() => askHint('letter')} disabled={!!hints.letter}>
                  💡 {t.hintLetter} −25
                </button>
                {round.hasCategory && (
                  <button className="btn-secondary !min-h-[44px] !px-1.5 !text-[15px] whitespace-nowrap" onClick={() => askHint('category')} disabled={!!hints.category}>
                    💡 {t.hintCategory} −10
                  </button>
                )}
              </div>
              {(hints.letter || hints.category) && (
                <div className="text-center text-xl font-bold">
                  {hints.letter && <span className="mr-4">{t.hintLetter}: {hints.letter}</span>}
                  {hints.category && <span>{hints.category}</span>}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {confirmLeave && (
        <ConfirmDialog
          title={t.leaveTitle}
          body={room.solo ? t.leaveBodySolo : t.leaveBodyGroup}
          cancelLabel={t.keepPlaying}
          confirmLabel={t.leaveGame}
          onCancel={() => setConfirmLeave(false)}
          onConfirm={onLeave}
        />
      )}
    </div>
  );
}
