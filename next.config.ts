import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pages are built ahead of time where possible; "use cache" marks data
  // (like lesson files) that only changes when the files change.
  cacheComponents: true,
  // Off for now: with it on, a made-up address (e.g. /trails/typo) answered
  // "200 OK" before showing "not found", instead of a proper 404.
  // Revisit in Phase 4 when we add offline caching.
  partialPrefetching: false,
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
