import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pages are built ahead of time where possible (lesson pages are listed by
  // generateStaticParams), which also makes them quick to save for offline.
  cacheComponents: true,
  // Off: with it on, a made-up address (e.g. /trails/typo) answered "200 OK"
  // before showing "not found", instead of a proper 404. Reviewed in Phase 4:
  // offline support doesn't need it (the service worker saves whole pages).
  partialPrefetching: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // The service worker must never be cached by the browser, so updates arrive.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
