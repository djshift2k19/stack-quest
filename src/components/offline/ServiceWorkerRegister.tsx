"use client";

import { useEffect } from "react";

/**
 * Switches on the service worker (public/sw.js) so Stack Quest works offline.
 * Only in the real ("production") build: in development it would keep
 * serving old copies while you edit, which is confusing.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not supported or blocked (e.g. some private windows): the app still works online.
    });
  }, []);
  return null;
}
