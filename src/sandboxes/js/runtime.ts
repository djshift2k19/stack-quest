/**
 * The JavaScript runtime that runs INSIDE the sandbox.
 *
 * IMPORTANT: `createJsRuntime` must be completely self-contained (no
 * imports, no variables from outside the function, no classes). It is
 * turned into text with `.toString()` and sent into the sandbox, where
 * none of the app's code exists.
 *
 * It provides:
 *   - a pretend `console` that records what the code prints
 *   - `expect(...)`, a tiny test library for checking answers
 *   - a pretend `fetch` and `server`, so learners can practise API
 *     requests and responses without any real network
 */

import type { JsJob, LogLine, RunResult } from "../types";

export function createJsRuntime() {
  /* ---------- Turning values into readable text ---------- */
  function format(value: unknown, depth = 0, top = true): string {
    if (typeof value === "string") return top ? value : JSON.stringify(value);
    if (value === undefined) return "undefined";
    if (value === null) return "null";
    if (typeof value === "function") return `[Function ${(value as { name?: string }).name || "anonymous"}]`;
    if (typeof value === "bigint") return `${value}n`;
    if (typeof value !== "object") return String(value);
    if (value instanceof Error) return `${value.name}: ${value.message}`;
    if (depth > 3) return Array.isArray(value) ? "[Array]" : "[Object]";
    if (Array.isArray(value)) return `[${value.map((v) => format(v, depth + 1, false)).join(", ")}]`;
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    return `{ ${entries.map(([k, v]) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${format(v, depth + 1, false)}`).join(", ")} }`;
  }

  function deepEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true;
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }

  /* ---------- expect(): a tiny test library ---------- */
  function assertionError(message: string) {
    const e = new Error(message);
    e.name = "AssertionError";
    return e;
  }

  function makeMatchers(actual: unknown, negate: boolean) {
    const check = (ok: boolean, message: string, negMessage: string) => {
      if (ok === negate) throw assertionError(negate ? negMessage : message);
    };
    const show = (v: unknown) => format(v, 0, false);
    return {
      toBe(expected: unknown) {
        check(Object.is(actual, expected), `Expected ${show(expected)} but got ${show(actual)}`, `Expected anything except ${show(expected)}`);
      },
      toEqual(expected: unknown) {
        check(deepEqual(actual, expected), `Expected ${show(expected)} but got ${show(actual)}`, `Expected something different from ${show(expected)}`);
      },
      toBeTruthy() {
        check(Boolean(actual), `Expected a "truthy" value but got ${show(actual)}`, `Expected a "falsy" value but got ${show(actual)}`);
      },
      toBeFalsy() {
        check(!actual, `Expected a "falsy" value but got ${show(actual)}`, `Expected a "truthy" value but got ${show(actual)}`);
      },
      toBeDefined() {
        check(actual !== undefined, "Expected a value but got undefined", `Expected undefined but got ${show(actual)}`);
      },
      toBeUndefined() {
        check(actual === undefined, `Expected undefined but got ${show(actual)}`, "Expected a value but got undefined");
      },
      toContain(item: unknown) {
        const ok =
          typeof actual === "string" ? actual.includes(String(item)) : Array.isArray(actual) && actual.some((v) => deepEqual(v, item));
        check(ok, `Expected ${show(actual)} to contain ${show(item)}`, `Expected ${show(actual)} not to contain ${show(item)}`);
      },
      toMatch(pattern: RegExp | string) {
        const ok = typeof actual === "string" && (typeof pattern === "string" ? actual.includes(pattern) : pattern.test(actual));
        check(ok, `Expected ${show(actual)} to match ${String(pattern)}`, `Expected ${show(actual)} not to match ${String(pattern)}`);
      },
      toHaveLength(length: number) {
        const actualLength = (actual as { length?: number } | null)?.length;
        check(actualLength === length, `Expected a length of ${length} but got ${show(actualLength)}`, `Expected a length other than ${length}`);
      },
      toBeGreaterThan(n: number) {
        check((actual as number) > n, `Expected more than ${n} but got ${show(actual)}`, `Expected ${n} or less but got ${show(actual)}`);
      },
      toBeLessThan(n: number) {
        check((actual as number) < n, `Expected less than ${n} but got ${show(actual)}`, `Expected ${n} or more but got ${show(actual)}`);
      },
      toThrow() {
        let threw = false;
        try {
          (actual as () => void)();
        } catch {
          threw = true;
        }
        check(threw, "Expected the code to throw an error, but it didn't", "Expected the code not to throw an error, but it did");
      },
    };
  }

  function expect(actual: unknown) {
    return { ...makeMatchers(actual, false), not: makeMatchers(actual, true) };
  }

  /* ---------- Pretend console ---------- */
  function makeConsole(onLog: (line: LogLine) => void) {
    const write = (level: LogLine["level"]) => (...args: unknown[]) => onLog({ level, text: args.map((a) => format(a)).join(" ") });
    return { log: write("log"), info: write("info"), warn: write("warn"), error: write("error") };
  }

  /* ---------- Pretend API: fetch + server ---------- */
  type Handler = (req: unknown, res: unknown) => unknown;
  function makeFakeNetwork(routes: NonNullable<JsJob["api"]>, requests: RunResult["requests"]) {
    const handlers: { method: string; path: string; handle: Handler }[] = [];
    const register = (method: string) => (path: string, handle: Handler) => {
      handlers.push({ method, path, handle });
    };
    const server = { get: register("GET"), post: register("POST"), put: register("PUT"), patch: register("PATCH"), delete: register("DELETE") };

    function matchPath(pattern: string, path: string): Record<string, string> | null {
      const p = pattern.split("/");
      const a = path.split("/");
      if (p.length !== a.length) return null;
      const params: Record<string, string> = {};
      for (let i = 0; i < p.length; i++) {
        if (p[i].startsWith(":")) params[p[i].slice(1)] = decodeURIComponent(a[i]);
        else if (p[i] !== a[i]) return null;
      }
      return params;
    }

    const STATUS_TEXT: Record<number, string> = {
      200: "OK", 201: "Created", 204: "No Content", 400: "Bad Request", 401: "Unauthorized",
      403: "Forbidden", 404: "Not Found", 422: "Unprocessable Content", 500: "Internal Server Error",
    };

    function response(status: number, body: unknown) {
      const text = body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body);
      return {
        status,
        ok: status >= 200 && status < 300,
        statusText: STATUS_TEXT[status] ?? "",
        headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null) },
        json: async () => {
          try {
            return JSON.parse(text);
          } catch {
            throw new SyntaxError("The response isn't valid JSON");
          }
        },
        text: async () => text,
      };
    }

    async function fetch(url: string, options: { method?: string; body?: string } = {}) {
      const method = (options.method ?? "GET").toUpperCase();
      const parsed = new URL(String(url), "https://api.example.test");
      const path = parsed.pathname;
      let body: unknown = options.body;
      try {
        if (typeof body === "string") body = JSON.parse(body);
      } catch {
        // Not JSON: leave as text.
      }

      let status = 404;
      let out: unknown = { error: `Nothing at ${method} ${path}` };

      const handler = handlers.find((h) => h.method === method && matchPath(h.path, path));
      const route = routes.find((r) => r.method === method && matchPath(r.path, path));
      if (handler) {
        const res = {
          statusCode: 200,
          body: undefined as unknown,
          status(code: number) {
            this.statusCode = code;
            return this;
          },
          json(data: unknown) {
            this.body = data;
            return this;
          },
          send(data: unknown) {
            this.body = data;
            return this;
          },
        };
        const req = {
          method,
          path,
          params: matchPath(handler.path, path),
          query: Object.fromEntries(parsed.searchParams.entries()),
          body,
        };
        await handler.handle(req, res);
        status = res.statusCode;
        out = res.body;
      } else if (route) {
        status = route.status;
        out = route.body;
      }
      requests.push({ method, path: path + parsed.search, status });
      // Copy the data so changing the response can't change the "server's" copy.
      return response(status, out === undefined ? undefined : JSON.parse(JSON.stringify(out)));
    }

    return { fetch, server };
  }

  /* ---------- Running code + tests ---------- */
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (...args: string[]) => (
    ...args: unknown[]
  ) => Promise<unknown>;

  /** Find the learner's line number from an error's stack trace. */
  function lineFromStack(err: unknown): number | undefined {
    const stack = (err as { stack?: string })?.stack ?? "";
    const m = stack.match(/<anonymous>:(\d+):\d+/);
    // The generated function adds 2 lines before the learner's code.
    return m ? Math.max(1, Number(m[1]) - 2) : undefined;
  }

  async function run(job: JsJob, onLog?: (line: LogLine) => void): Promise<RunResult> {
    const logs: LogLine[] = [];
    const requests: RunResult["requests"] = [];
    const fakeConsole = makeConsole((line) => {
      logs.push(line);
      onLog?.(line);
    });
    const { fetch, server } = makeFakeNetwork(job.api ?? [], requests);

    const testBodies = job.tests.map((t) => `async () => {\n${t.code ?? ""}\n}`).join(",\n");
    const body = `${job.code}\n;return [${testBodies}];`;

    let testFns: (() => Promise<unknown>)[];
    try {
      const fn = new AsyncFunction("expect", "console", "fetch", "server", body);
      testFns = (await fn(expect, fakeConsole, fetch, server)) as (() => Promise<unknown>)[];
    } catch (err) {
      const e = err as Error;
      return {
        logs,
        requests,
        results: job.tests.map((t) => ({ name: t.name, passed: false, message: "Didn't run because the code crashed first" })),
        error: { name: e?.name ?? "Error", message: e?.message ?? String(err), line: lineFromStack(err) },
      };
    }

    const results = [];
    for (let i = 0; i < job.tests.length; i++) {
      try {
        await testFns[i]();
        results.push({ name: job.tests[i].name, passed: true });
      } catch (err) {
        const e = err as Error;
        const message = e?.name === "AssertionError" ? e.message : `${e?.name ?? "Error"}: ${e?.message ?? String(err)}`;
        results.push({ name: job.tests[i].name, passed: false, message });
      }
    }
    return { logs, requests, results };
  }

  return { run, format };
}

/** The runtime as text, ready to send into a sandbox. */
export const JS_RUNTIME_SOURCE = `(${createJsRuntime.toString()})()`;
