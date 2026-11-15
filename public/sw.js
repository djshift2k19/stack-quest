/*
 * Stack Quest's service worker: a small helper the browser runs in the
 * background, even when no Stack Quest tab is open. It sits between the
 * app and the network, keeps copies of what you've used, and serves those
 * copies when you're offline.
 *
 * Plain JavaScript on purpose: it's served as-is from public/, so you can
 * read every line. "How This App Works" explains it step by step.
 *
 * Strategies:
 *   - App files (/_next/static, icons, the SQL engine) never change once
 *     published (their names include a fingerprint), so they come from the
 *     cache first ("cache-first").
 *   - Pages try the network first, so you get the newest version, but fall
 *     back to the saved copy if the network is slow or gone ("network-first").
 *   - Logins and syncing (Supabase) always go to the network and are never cached.
 */

const VERSION = "v1";
const PAGES = `sq-pages-${VERSION}`;
const ASSETS = `sq-assets-${VERSION}`;
const NETWORK_TIMEOUT_MS = 4000;

// Saved during installation, so the basics work offline straight away.
const CORE_PAGES = ["/", "/offline", "/glossary", "/profile"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.addAll(CORE_PAGES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  // Remove caches from older versions of this file.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("sq-") && k !== PAGES && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/sql/") ||
    /\.(png|svg|ico|woff2?|webmanifest)$/.test(url.pathname)
  );
}

/** A copy of the page address without Next.js's internal query details. */
function pageKey(url) {
  return url.origin + url.pathname;
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(ASSETS);
    cache.put(request, response.clone());
  }
  return response;
}

/** Try the network, but give up after a few seconds (slow connections are common). */
function fetchWithTimeout(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), NETWORK_TIMEOUT_MS);
    fetch(request).then(
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function networkFirstPage(request, url) {
  try {
    const response = await fetchWithTimeout(request);
    if (response.ok) {
      const cache = await caches.open(PAGES);
      cache.put(pageKey(url), response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(pageKey(url));
    return cached ?? (await caches.match("/offline")) ?? new Response("You're offline.", { status: 503 });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // e.g. Supabase: always the network

  if (isAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request, url));
    return;
  }

  // Next.js switches pages inside the app with special "RSC" requests. If
  // one fails offline, answer with a plain (non-RSC) reply: Next.js then
  // falls back to a normal page load, which networkFirstPage can serve
  // from the saved copy.
  if (request.headers.get("RSC") === "1") {
    event.respondWith(
      fetch(request).catch(() => new Response("offline", { status: 503, headers: { "Content-Type": "text/plain" } })),
    );
  }
});

/*
 * "Save everything for offline" (from the profile page). The page sends a
 * list of addresses. Each page is saved, along with every app file it
 * mentions, and the app files those mention, so every exercise type works
 * offline too.
 */
self.addEventListener("message", (event) => {
  if (event.data?.type !== "save-all") return;
  const port = event.ports[0];
  event.waitUntil(
    saveAll(event.data.urls, (done, total, bytes) => port?.postMessage({ type: "progress", done, total, bytes }))
      .then((result) => port?.postMessage({ type: "done", ...result }))
      .catch((error) => port?.postMessage({ type: "error", message: String(error?.message ?? error) })),
  );
});

async function saveAll(urls, onProgress) {
  const pages = await caches.open(PAGES);
  const assets = await caches.open(ASSETS);
  const seenAssets = new Set();
  const queue = [];
  let bytes = 0;
  // App files are mentioned as "/_next/static/chunks/abc.js" in pages, but
  // as just "static/chunks/abc.js" inside other app files. Find both.
  // (The big SQL engine files are skipped on purpose: they're saved only
  // when you choose to download the engine in a SQL lesson.)
  const findAssets = (text) => {
    for (const m of text.matchAll(/(?:\/?_next\/)?static\/(?:chunks|css|media)\/[A-Za-z0-9_\-./~%]+?\.(?:js|css|woff2?)/g)) {
      const path = "/_next/" + m[0].replace(/^\/?(?:_next\/)?/, "");
      if (!seenAssets.has(path)) {
        seenAssets.add(path);
        queue.push(path);
      }
    }
  };

  let done = 0;
  for (const path of urls) {
    const response = await fetch(path, { credentials: "same-origin" });
    if (response.ok) {
      const text = await response.clone().text();
      bytes += text.length;
      await pages.put(pageKey(new URL(path, self.location.origin)), response);
      findAssets(text);
    }
    onProgress(++done, urls.length, bytes);
  }

  while (queue.length) {
    const path = queue.shift();
    if (await assets.match(path)) continue;
    const response = await fetch(path);
    if (!response.ok) continue;
    if (path.endsWith(".js")) findAssets(await response.clone().text());
    bytes += Number(response.headers.get("content-length") ?? 0) || (await response.clone().arrayBuffer()).byteLength;
    await assets.put(path, response);
  }
  return { pages: urls.length, assets: seenAssets.size, bytes };
}
