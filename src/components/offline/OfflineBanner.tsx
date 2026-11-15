"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** True when the browser says there's no connection. */
export function useIsOffline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !navigator.onLine,
    () => false,
  );
}

/** A calm notice at the top of the page while you're offline. */
export function OfflineBanner() {
  const offline = useIsOffline();
  if (!offline) return null;
  return (
    <div role="status" className="bg-gold-soft px-4 py-2 text-center text-sm" data-testid="offline-banner">
      <span aria-hidden="true">📴 </span>
      You&apos;re offline. Lessons you&apos;ve opened (or saved) still work, and your progress is saved on this device.
    </div>
  );
}
