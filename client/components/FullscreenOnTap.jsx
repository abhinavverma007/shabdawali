// Browsers only allow fullscreen in response to a tap or click, so it is requested from the tap that enters a game:
// Create Room, Join, or Play Solo. Browsing the landing page or the guide never goes fullscreen.
// iPhone Safari has no fullscreen for web pages at all; there, Add to Home Screen is the way (see InstallHint).
export function fullscreenSupported() {
  const el = document.documentElement;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
}

export function isStandalone() {
  return !!(window.navigator.standalone || window.matchMedia?.('(display-mode: fullscreen), (display-mode: standalone)').matches);
}

export function enterFullscreen() {
  if (isStandalone() || !fullscreenSupported()) return;
  const el = document.documentElement;
  if (document.fullscreenElement || document.webkitFullscreenElement) return;
  try {
    const result = (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    result?.catch?.(() => {});
  } catch {}
}
