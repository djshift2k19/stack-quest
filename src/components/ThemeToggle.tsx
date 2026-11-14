"use client";

import { useSyncExternalStore } from "react";

type Theme = "system" | "light" | "dark";
const STORAGE_KEY = "sq-theme";
const ORDER: Theme[] = ["system", "light", "dark"];
const LABELS: Record<Theme, string> = { system: "Auto", light: "Light", dark: "Dark" };
const ICONS: Record<Theme, string> = { system: "🖥️", light: "☀️", dark: "🌙" };

/** Runs before the page is shown, so dark-mode users never see a white flash. */
export const themeScript = `try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

const listeners = new Set<() => void>();

function readTheme(): Theme {
  const t = document.documentElement.dataset.theme;
  return t === "light" || t === "dark" ? t : "system";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    if (theme === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked: the choice lasts until the tab closes.
  }
  listeners.forEach((l) => l());
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-3 text-sm hover:bg-surface-2"
      aria-label={`Colour theme: ${LABELS[theme]}. Switch to ${LABELS[next]}.`}
    >
      <span aria-hidden="true">{ICONS[theme]}</span>
      <span className="hidden sm:inline">{LABELS[theme]}</span>
    </button>
  );
}
