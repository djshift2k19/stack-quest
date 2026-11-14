"use client";

/** Small shared pieces used by every exercise type. */

import type { ReactNode } from "react";
import { translateError, type ErrorInfo } from "@/lib/engine/errorTranslator";
import type { FakeRequest, LogLine, TestResult } from "@/sandboxes/types";

export const primaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 font-semibold text-accent-contrast hover:opacity-90 disabled:opacity-50";
export const secondaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-border px-4 text-sm hover:bg-surface-2 disabled:opacity-50";

export function ExerciseCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="mt-8 rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

/**
 * The three-step hint ladder: nudge, bigger hint, near-solution. After
 * those, the full solution can be shown. Using hints is never a penalty;
 * the only difference is you don't get the no-hint bonus.
 */
export function HintLadder({
  hints,
  shown,
  onShowNext,
  solution,
  solutionShown,
  onShowSolution,
}: {
  hints: string[];
  shown: number;
  onShowNext: () => void;
  solution?: ReactNode;
  solutionShown?: boolean;
  onShowSolution?: () => void;
}) {
  const labels = ["Nudge", "Bigger hint", "Nearly there"];
  return (
    <div className="mt-4 rounded-xl border border-border bg-surface-2 p-3" aria-label="Hints">
      {shown > 0 && (
        <ol className="mb-3 space-y-2" aria-live="polite">
          {hints.slice(0, shown).map((h, i) => (
            <li key={i} className="rounded-lg bg-surface p-3 text-sm">
              <span className="font-semibold">
                <span aria-hidden="true">💡 </span>
                {labels[i] ?? `Hint ${i + 1}`}:
              </span>{" "}
              {h}
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {shown < hints.length ? (
          <button type="button" className={secondaryButton} onClick={onShowNext}>
            {shown === 0 ? "Stuck? Show a hint" : `Show ${labels[shown]?.toLowerCase() ?? "next hint"}`}
          </button>
        ) : solution && !solutionShown ? (
          <button type="button" className={secondaryButton} onClick={onShowSolution}>
            Show the full solution
          </button>
        ) : null}
        {shown === 0 && <span className="text-xs text-muted">Finish without hints for a 50% XP bonus. Hints are always fine, though!</span>}
      </div>
      {solutionShown && solution && (
        <div className="mt-3" aria-live="polite">
          <p className="mb-2 text-sm">
            Here&apos;s one way to solve it. Read it line by line, then try typing it yourself. You still earn the unit&apos;s XP.
          </p>
          {solution}
        </div>
      )}
    </div>
  );
}

export function ErrorExplanation({ error, language }: { error: ErrorInfo; language: "javascript" | "sql" }) {
  const t = translateError(error, language);
  return (
    <div role="alert" data-testid="error-explanation" className="mt-4 rounded-xl border border-flame/40 bg-surface p-4">
      <p className="font-semibold">
        <span aria-hidden="true">🛠️ </span>
        {t.title}
      </p>
      <p className="mt-1 text-sm">{t.explanation}</p>
      <p className="mt-2 text-sm">
        <strong>Where to look:</strong> {t.whereToLook}
      </p>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-muted">The real error message</summary>
        <pre className="mt-1 overflow-x-auto rounded-lg bg-surface-2 p-2 font-mono text-xs">
          {error.name}: {error.message}
          {error.line ? ` (line ${error.line})` : ""}
        </pre>
      </details>
    </div>
  );
}

export function TestResults({ results }: { results: TestResult[] }) {
  if (results.length === 0) return null;
  const passed = results.filter((r) => r.passed).length;
  return (
    <div className="mt-4" data-testid="test-results">
      <p className="text-sm font-semibold">
        Checks: {passed} of {results.length} passing
      </p>
      <ul className="mt-2 space-y-1">
        {results.map((r, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span aria-hidden="true">{r.passed ? "✅" : "⭕"}</span>
            <span>
              <span className="sr-only">{r.passed ? "Passed: " : "Not yet: "}</span>
              {r.name}
              {!r.passed && r.message && <span className="block text-muted">{r.message}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ConsoleOutput({ logs, requests = [] }: { logs: LogLine[]; requests?: FakeRequest[] }) {
  if (logs.length === 0 && requests.length === 0) return null;
  return (
    <div className="mt-4 space-y-3">
      {logs.length > 0 && (
        <div>
          <p className="text-sm font-semibold">Console output</p>
          <pre className="mt-1 max-h-60 overflow-auto rounded-lg border border-border bg-surface-2 p-3 font-mono text-sm" data-testid="console">
            {logs.map((l, i) => (
              <div key={i} className={l.level === "error" ? "text-flame" : l.level === "warn" ? "text-gold" : ""}>
                {l.text}
              </div>
            ))}
          </pre>
        </div>
      )}
      {requests.length > 0 && (
        <div>
          <p className="text-sm font-semibold">Requests to the pretend API</p>
          <ul className="mt-1 rounded-lg border border-border bg-surface-2 p-3 font-mono text-sm">
            {requests.map((r, i) => (
              <li key={i}>
                {r.method} {r.path} → <strong>{r.status}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ResultTable({ columns, rows }: { columns: string[]; rows: unknown[][] }) {
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold">
        Result: {rows.length} row{rows.length === 1 ? "" : "s"}
      </p>
      <div className="mt-1 max-h-72 overflow-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-left font-mono text-sm" data-testid="sql-result">
          <thead className="bg-surface-2">
            <tr>
              {columns.map((c, i) => (
                <th key={i} scope="col" className="border-b border-border px-3 py-2 font-semibold">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="odd:bg-surface even:bg-surface-2/50">
                {row.map((v, j) => (
                  <td key={j} className="border-b border-border px-3 py-1.5">
                    {v === null ? <span className="text-muted">NULL</span> : String(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CodeBlock({ code }: { code: string }) {
  return <pre className="overflow-x-auto rounded-[10px] border border-border bg-surface-2 p-3 font-mono text-sm leading-relaxed">{code}</pre>;
}
