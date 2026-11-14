/// <reference lib="webworker" />
/**
 * A background worker that holds the in-browser Postgres database (PGlite).
 * Running it here means a slow query can't freeze the page, and the app can
 * stop the worker if a query takes too long.
 */

import { PGlite } from "@electric-sql/pglite";
import { runSqlJob, type SqlJob } from "./sqlCore";

/**
 * Download the compressed copy of the engine's data file (made by
 * scripts/prepare-sql-engine.mjs) and unpack it here, which saves about
 * 4 MB of data compared with the uncompressed original.
 */
async function loadFsBundle(): Promise<Blob> {
  const res = await fetch("/sql/pglite.data.gz");
  if (!res.ok || !res.body) throw new Error(`Couldn't download the SQL engine (status ${res.status})`);
  const unpacked = res.body.pipeThrough(new DecompressionStream("gzip"));
  return new Response(unpacked).blob();
}

const ready = loadFsBundle().then((fsBundle) => PGlite.create({ fsBundle }));

ready.then(
  () => self.postMessage({ kind: "ready" }),
  (err) => self.postMessage({ kind: "load-error", message: String(err?.message ?? err) }),
);

self.onmessage = async (event: MessageEvent<{ id: number; job: SqlJob }>) => {
  const { id, job } = event.data;
  const db = await ready;
  try {
    const result = await runSqlJob(db, job);
    self.postMessage({ kind: "result", id, result });
  } catch (err) {
    self.postMessage({
      kind: "result",
      id,
      result: {
        logs: [],
        requests: [],
        results: job.tests.map((t) => ({ name: t.name, passed: false, message: "Didn't run" })),
        error: { name: "SQL error", message: String((err as Error)?.message ?? err) },
      },
    });
  }
};
