import type { MetadataRoute } from "next";

/**
 * The "web app manifest": tells phones and computers how to install Stack
 * Quest like an app (name, icon, colours, opening page).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Stack Quest",
    short_name: "Stack Quest",
    description: "Learn full-stack web development from zero, one short unit at a time.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f4",
    theme_color: "#0b6e4f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
