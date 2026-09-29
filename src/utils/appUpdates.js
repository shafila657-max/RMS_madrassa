import { toast } from 'sonner';

// How long the app must have been in the background before a pending update is applied
// silently on return (short absences might be mid-task, e.g. copying a number from WhatsApp).
const SILENT_RELOAD_AFTER_MS = 5 * 60 * 1000;
const CHECK_EVERY_MS = 30 * 60 * 1000;

let reloading = false;
const reload = () => {
  if (reloading) return;
  reloading = true;
  window.location.reload();
};

/**
 * Keeps installed apps (PWA) and open tabs on the latest deployed version.
 *
 * The service worker (vite-plugin-pwa, skipWaiting + clientsClaim) activates a new version as
 * soon as it has downloaded it, but the page already open keeps running the old code, and an
 * installed app is usually resumed rather than restarted. So:
 *  - check for a new version on start, when the app comes back to the foreground, on
 *    pull-to-refresh, and every 30 minutes;
 *  - once a new version has taken over, reload straight away if the app is in the background,
 *    after a longer absence, or on pull-to-refresh; otherwise offer an "Update now" button.
 */
export function setupAppUpdates() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  // A page opened before a deploy may ask for a code chunk that no longer exists.
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reload();
  });

  // Without a controller at start, the first controllerchange is the initial install, not an update.
  const hadController = Boolean(navigator.serviceWorker.controller);
  let updateReady = false;
  let hiddenAt = 0;

  const checkForUpdate = () => {
    navigator.serviceWorker.getRegistration()
      .then(registration => registration?.update())
      .catch(() => { /* offline or unsupported: try again later */ });
  };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;
    updateReady = true;
    if (document.hidden) {
      reload();
      return;
    }
    toast('A new version of RMS Madrasa is ready', {
      id: 'app-update',
      duration: Infinity,
      action: { label: 'Update now', onClick: reload },
    });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      return;
    }
    if (updateReady && Date.now() - hiddenAt >= SILENT_RELOAD_AFTER_MS) {
      reload();
      return;
    }
    checkForUpdate();
  });

  // Pull-to-refresh is an explicit "refresh": apply a waiting update, or look for one.
  window.addEventListener('app-pull-refresh', () => {
    if (updateReady) reload();
    else checkForUpdate();
  });

  window.setInterval(checkForUpdate, CHECK_EVERY_MS);
  checkForUpdate();
}

/**
 * Asks the server for a newer version now. Resolves to 'found' (it downloads and the usual
 * "Update now" prompt follows), 'latest', or 'unsupported' (no service worker, e.g. in dev).
 */
export async function checkForAppUpdate() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return 'unsupported';
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return 'unsupported';
  await registration.update();
  return registration.installing || registration.waiting ? 'found' : 'latest';
}
