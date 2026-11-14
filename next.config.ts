import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pages are built ahead of time where possible; "use cache" marks data
  // (like lesson files) that only changes when the files change.
  cacheComponents: true,
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
