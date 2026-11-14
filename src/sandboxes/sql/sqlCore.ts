/**
 * Runs a learner's SQL against a real (in-browser) Postgres database and
 * checks it. Used by the SQL worker, and by the tests directly.
 *
 * Each run starts from a clean database: the lesson's `setup` statements
 * create and fill the tables, then the learner's SQL runs.
 */

import type { PGliteInterface } from "@electric-sql/pglite";
import type { ChallengeTest } from "@/lib/content/schema";
import type { RunResult, TestResult } from "../types";

export interface SqlTable {
  columns: string[];
  rows: unknown[][];
}

export interface SqlJob {
  setup?: string;
  code: string;
  tests: ChallengeTest[];
}

export interface SqlRunResult extends RunResult {
  /** The result of the learner's last query that returned rows. */
  table?: SqlTable;
  /** e.g. "INSERT 0 1": what the last statement did, when it returned no rows. */
  summary?: string;
}

async function reset(db: PGliteInterface, setup?: string) {
  await db.exec("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  if (setup) await db.exec(setup);
}

async function runForTable(db: PGliteInterface, sql: string): Promise<{ table?: SqlTable; summary?: string }> {
  const results = await db.exec(sql, { rowMode: "array" });
  const withRows = [...results].reverse().find((r) => r.fields.length > 0);
  if (withRows) {
    return { table: { columns: withRows.fields.map((f) => f.name), rows: withRows.rows as unknown as unknown[][] } };
  }
  const last = results.at(-1);
  return { summary: last ? `${last.command ?? "Done"}${last.affectedRows !== undefined ? `: ${last.affectedRows} row(s) changed` : ""}` : "Done" };
}

/** Make values comparable: 3, 3n and "3" are all the same answer. */
export function normalise(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function sameRows(a: unknown[][], b: unknown[][], orderMatters: boolean): boolean {
  const norm = (rows: unknown[][]) => rows.map((r) => JSON.stringify(r.map(normalise)));
  const x = norm(a);
  const y = norm(b);
  if (!orderMatters) {
    x.sort();
    y.sort();
  }
  return x.length === y.length && x.every((row, i) => row === y[i]);
}

/** Postgres reports where an error is as a character position; turn it into a line number. */
export function lineFromPosition(code: string, position: unknown): number | undefined {
  const pos = Number(position);
  if (!Number.isFinite(pos) || pos < 1) return undefined;
  return code.slice(0, pos - 1).split("\n").length;
}

const describeRows = (n: number) => `${n} row${n === 1 ? "" : "s"}`;

export async function runSqlJob(db: PGliteInterface, job: SqlJob): Promise<SqlRunResult> {
  const base = { logs: [], requests: [] };
  await reset(db, job.setup);

  let learner: { table?: SqlTable; summary?: string };
  try {
    learner = await runForTable(db, job.code);
  } catch (err) {
    const e = err as { message?: string; position?: unknown };
    return {
      ...base,
      results: job.tests.map((t) => ({ name: t.name, passed: false, message: "Didn't run because the query had an error" })),
      error: { name: "SQL error", message: e.message ?? String(err), line: lineFromPosition(job.code, e.position) },
    };
  }

  const results: TestResult[] = new Array(job.tests.length);

  // 1. "check" tests look at the database straight after the learner's SQL.
  for (const [i, t] of job.tests.entries()) {
    if (!t.check) continue;
    try {
      const { table } = await runForTable(db, t.check);
      const ok = sameRows(table?.rows ?? [], t.expect ?? [], t.orderMatters);
      results[i] = ok
        ? { name: t.name, passed: true }
        : { name: t.name, passed: false, message: `The data isn't what was expected yet (found ${describeRows(table?.rows.length ?? 0)})` };
    } catch (err) {
      results[i] = { name: t.name, passed: false, message: (err as Error).message };
    }
  }

  // 2. "sameResultAs" tests compare the learner's result with the model answer's, on a fresh copy.
  for (const [i, t] of job.tests.entries()) {
    if (!t.sameResultAs) continue;
    await reset(db, job.setup);
    const expected = (await runForTable(db, t.sameResultAs)).table;
    const got = learner.table;
    if (!got) {
      results[i] = { name: t.name, passed: false, message: "Your SQL didn't return any rows. Did you write a SELECT?" };
    } else if (expected && got.columns.length !== expected.columns.length) {
      results[i] = {
        name: t.name,
        passed: false,
        message: `Expected ${expected.columns.length} column(s) but got ${got.columns.length}`,
      };
    } else if (expected && !sameRows(got.rows, expected.rows, t.orderMatters)) {
      const sizeNote = got.rows.length !== expected.rows.length ? `: expected ${describeRows(expected.rows.length)}, got ${describeRows(got.rows.length)}` : "";
      results[i] = {
        name: t.name,
        passed: false,
        message: `The rows don't match yet${sizeNote}${t.orderMatters && !sizeNote ? " (check the order)" : ""}`,
      };
    } else {
      results[i] = { name: t.name, passed: true };
    }
  }

  return { ...base, results, table: learner.table, summary: learner.summary };
}
