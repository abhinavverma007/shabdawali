'use client';

import { useEffect, useState } from 'react';
import { fullscreenSupported, isStandalone } from './FullscreenOnTap';

const KEY = 'shabdawali.installHintDismissed';

// iPhone Safari cannot go fullscreen from a web page; the only way is Add to Home Screen.
// Shown once, only on iPhone/iPad Safari, and only until dismissed or installed.
export default function InstallHint({ t }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (ios && !isStandalone() && !fullscreenSupported() && !localStorage.getItem(KEY)) setShow(true);
    } catch {}
  }, []);

  if (!show) return null;
  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(KEY, '1');
    } catch {}
  };

  return (
    <p role="note" className="flex items-start gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm text-stone-700 ring-1 ring-stone-300">
      <span className="flex-1">📲 {t.installHint}</span>
      <button type="button" onClick={dismiss} aria-label="Close" className="shrink-0 px-1 text-base font-bold">
        ✕
      </button>
    </p>
  );
}
