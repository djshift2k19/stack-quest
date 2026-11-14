/// <reference lib="webworker" />
/**
 * A background worker that holds the in-browser Postgres database (PGlite).
 * Running it here means a slow query can't freeze the page, and the app can
 * stop the worker if a query takes too long.
 */

import { PGlite } from "@electric-sql/pglite";
import { runSqlJob, type SqlJob } from "./sqlCore";

const ready = PGlite.create();

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
