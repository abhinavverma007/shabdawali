'use client';

import { useEffect } from 'react';

// Browsers only allow fullscreen in response to a tap or click, so the page cannot do it the instant it loads.
// This waits for the first tap anywhere and goes fullscreen then. It tries once per page load, so a player who
// deliberately leaves fullscreen is not pulled back in.
// iPhone Safari has no fullscreen for web pages at all; there, Add to Home Screen is the way (see InstallHint).
export function fullscreenSupported() {
  const el = document.documentElement;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
}

export function isStandalone() {
  return !!(window.navigator.standalone || window.matchMedia?.('(display-mode: fullscreen), (display-mode: standalone)').matches);
}

export default function FullscreenOnTap() {
  useEffect(() => {
    if (isStandalone() || !fullscreenSupported()) return;
    const go = () => {
      const el = document.documentElement;
      if (document.fullscreenElement || document.webkitFullscreenElement) return;
      try {
        const result = (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
        result?.catch?.(() => {});
      } catch {}
    };
    // click fires after a complete tap, which every browser accepts as a user gesture.
    document.addEventListener('click', go, { once: true, capture: true });
    return () => document.removeEventListener('click', go, { capture: true });
  }, []);
  return null;
}
