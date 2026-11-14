"use client";

/**
 * Talks to the SQL worker. The database engine is about 5 MB, so it's only
 * downloaded when the learner agrees (see SqlEngineGate). After that, the
 * browser keeps a copy, so it isn't downloaded again.
 */

import type { SqlJob, SqlRunResult } from "./sqlCore";

export const SQL_TIME_LIMIT_MS = 5000;
const DOWNLOADED_KEY = "sq-sql-engine-downloaded";

let worker: Worker | null = null;
let ready: Promise<void> | null = null;
let counter = 0;

export function sqlEngineWasDownloaded(): boolean {
  try {
    return localStorage.getItem(DOWNLOADED_KEY) === "yes";
  } catch {
    return false;
  }
}

export function loadSqlEngine(): Promise<void> {
  if (ready) return ready;
  const w = new Worker(new URL("./sql.worker.ts", import.meta.url), { type: "module" });
  worker = w;
  ready = new Promise<void>((resolve, reject) => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.kind === "ready") {
        w.removeEventListener("message", onMessage);
        try {
          localStorage.setItem(DOWNLOADED_KEY, "yes");
        } catch {
          // Can't remember the choice; we'll just ask again next time.
        }
        resolve();
      } else if (e.data?.kind === "load-error") {
        reject(new Error(e.data.message));
      }
    };
    w.addEventListener("message", onMessage);
    w.addEventListener("error", (e) => reject(new Error(e.message || "The SQL engine couldn't start")));
  });
  ready.catch(() => {
    worker?.terminate();
    worker = null;
    ready = null;
  });
  return ready;
}

export async function runSql(job: SqlJob, timeoutMs = SQL_TIME_LIMIT_MS): Promise<SqlRunResult> {
  await loadSqlEngine();
  const w = worker!;
  const id = ++counter;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      // Stop the stuck database and start a fresh one next time.
      w.terminate();
      worker = null;
      ready = null;
      w.removeEventListener("message", onMessage);
      resolve({
        logs: [],
        requests: [],
        results: job.tests.map((t) => ({ name: t.name, passed: false, message: "Didn't finish" })),
        error: { name: "TimeoutError", message: `Stopped after ${timeoutMs / 1000} seconds` },
      });
    }, timeoutMs);
    function onMessage(e: MessageEvent) {
      if (e.data?.kind !== "result" || e.data.id !== id) return;
      clearTimeout(timer);
      w.removeEventListener("message", onMessage);
      resolve(e.data.result as SqlRunResult);
    }
    w.addEventListener("message", onMessage);
    w.postMessage({ id, job });
  });
}
