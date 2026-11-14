"use client";

import { useEffect, useState, type ReactNode } from "react";
import { loadSqlEngine, sqlEngineWasDownloaded } from "@/sandboxes/sql/sqlClient";
import { primaryButton } from "./ui";

type Status = "idle" | "loading" | "ready" | "error";

/**
 * The SQL engine is a real database (about 5 MB). Data costs money, so it
 * only downloads when the learner says so. After the first time, the
 * browser keeps a copy and it starts automatically.
 */
export function SqlEngineGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  function waitForEngine() {
    loadSqlEngine().then(
      () => setStatus("ready"),
      (err: Error) => {
        setMessage(err.message);
        setStatus("error");
      },
    );
  }

  function start() {
    setStatus("loading");
    waitForEngine();
  }

  useEffect(() => {
    // Already downloaded before? The browser has a copy, so start straight away.
    if (sqlEngineWasDownloaded()) waitForEngine();
  }, []);

  if (status === "ready") return <>{children}</>;

  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4" aria-live="polite">
      {status === "idle" && (
        <>
          <p className="font-semibold">This lesson uses a real database that runs in your browser.</p>
          <p className="mt-1 text-sm text-muted">
            It&apos;s a one-time download of about <strong>5 MB</strong> (well under R1 of mobile data). After that it works offline.
          </p>
          <button type="button" className={`${primaryButton} mt-3`} onClick={start}>
            Download the SQL engine (5 MB, once)
          </button>
        </>
      )}
      {status === "loading" && <p>Starting the database… (the first time can take a little while on a slow connection)</p>}
      {status === "error" && (
        <>
          <p className="font-semibold">The database couldn&apos;t start.</p>
          <p className="mt-1 text-sm text-muted">{message || "Check your connection and try again."}</p>
          <button type="button" className={`${primaryButton} mt-3`} onClick={start}>
            Try again
          </button>
        </>
      )}
    </div>
  );
}
