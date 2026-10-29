'use client';

// Shown if something in the page crashes, instead of a blank screen. The saved seat is untouched, so
// reloading puts the player straight back where they were.
export default function Error({ reset }) {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-4xl">😕</p>
      <h1 className="text-2xl font-extrabold text-orange-700">कुछ गड़बड़ हो गई · Something went wrong</h1>
      <p className="text-lg text-stone-700">पेज दोबारा खोलें, आपका खेल वहीं मिलेगा। · Reload and you will be back in your game.</p>
      <div className="flex gap-3">
        <button className="btn-primary" onClick={() => window.location.reload()}>
          Reload · दोबारा खोलें
        </button>
        <button className="btn-secondary" onClick={() => reset()}>
          Retry
        </button>
      </div>
    </main>
  );
}
