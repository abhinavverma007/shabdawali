'use client';

import { useEffect } from 'react';

// "Are you sure?" for actions that cannot be undone, like leaving a game in progress. The safe choice is the big
// orange button and has the focus; Escape or a tap outside also keeps the player in the game.
export default function ConfirmDialog({ title, body, cancelLabel, confirmLabel, onCancel, onConfirm }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="card w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-2xl font-extrabold">
          {title}
        </h2>
        <p className="mt-1 text-lg text-stone-700">{body}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button className="btn-primary !min-h-[48px] !px-2 !text-lg" autoFocus onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="btn-secondary !min-h-[48px] !px-2 !text-lg" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
