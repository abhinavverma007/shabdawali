// Short messages about things that happen to the room (someone left, the host changed the language).
// They disappear on their own; the page that owns the list removes them. They sit at the bottom, over empty space,
// so they never cover the timer, the Leave button or the puzzle.
export default function Toast({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex flex-col items-center gap-2 px-3" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="max-w-[94vw] rounded-2xl bg-stone-900 px-4 py-3 text-center text-base font-semibold text-white shadow-lg">
          {t.text}
        </div>
      ))}
    </div>
  );
}
