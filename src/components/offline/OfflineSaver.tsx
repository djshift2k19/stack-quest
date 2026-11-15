"use client";

import { useState } from "react";
import { secondaryButton } from "@/components/exercises/ui";
import type { Catalog } from "@/lib/content/catalog";
import { useProgress } from "@/lib/progress/ProgressProvider";

/** Every page address in the app, for saving offline. */
export function allPageUrls(catalog: Catalog): string[] {
  const urls = ["/", "/offline", "/glossary", "/profile"];
  for (const trail of catalog.trails) {
    urls.push(`/trails/${trail.id}`);
    for (const mod of trail.modules) {
      urls.push(`/trails/${mod.key}`);
      for (const unit of mod.units) urls.push(`/trails/${unit.key}`);
    }
  }
  return urls;
}

type Status =
  | { kind: "idle" }
  | { kind: "saving"; done: number; total: number }
  | { kind: "done"; pages: number }
  | { kind: "error"; message: string };

/**
 * "Save all lessons for offline": asks the service worker to download every
 * lesson page (and the app files they need) while you're on Wi-Fi.
 */
export function OfflineSaver() {
  const { catalog } = useProgress();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function save() {
    const registration = await navigator.serviceWorker?.ready;
    const worker = registration?.active;
    if (!worker) {
      setStatus({ kind: "error", message: "Offline saving isn't available in this browser (or in development mode)." });
      return;
    }
    const urls = allPageUrls(catalog);
    setStatus({ kind: "saving", done: 0, total: urls.length });
    const channel = new MessageChannel();
    channel.port1.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "progress") setStatus({ kind: "saving", done: msg.done, total: msg.total });
      if (msg.type === "done") setStatus({ kind: "done", pages: msg.pages });
      if (msg.type === "error") setStatus({ kind: "error", message: msg.message });
    };
    worker.postMessage({ type: "save-all", urls }, [channel.port2]);
  }

  return (
    <section aria-labelledby="offline-heading" className="rounded-xl border border-border bg-surface p-4">
      <h2 id="offline-heading" className="font-semibold">
        <span aria-hidden="true">📥 </span>Use Stack Quest offline
      </h2>
      <p className="mt-1 text-sm text-muted">
        Pages you open are saved automatically. To save <strong>every</strong> lesson at once, tap the button while you&apos;re on
        Wi-Fi (about 2 MB of data, once). The SQL engine is saved separately the first time you download it.
      </p>
      <div className="mt-3" aria-live="polite">
        {status.kind === "idle" && (
          <button type="button" className={secondaryButton} onClick={save}>
            Save all lessons for offline
          </button>
        )}
        {status.kind === "saving" && (
          <p className="text-sm">
            Saving… {status.done} of {status.total} pages
          </p>
        )}
        {status.kind === "done" && (
          <p className="text-sm" data-testid="offline-saved">
            ✅ Saved {status.pages} pages and the app files they need. They&apos;ll work without data.
          </p>
        )}
        {status.kind === "error" && <p className="text-sm text-flame">{status.message}</p>}
      </div>
    </section>
  );
}
