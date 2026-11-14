/**
 * Builds the sealed page (iframe) that runs learner JavaScript.
 *
 * Layers of safety:
 *  1. The iframe has sandbox="allow-scripts" but NOT allow-same-origin, so
 *     it gets a "nobody" origin: it can't read Stack Quest's storage,
 *     cookies or page.
 *  2. A Content Security Policy (CSP) inside it blocks all network access
 *     (default-src 'none'), so code can't download or send anything.
 *  3. The code runs in a Web Worker (a background thread) created inside
 *     the iframe, so an endless loop can be stopped after a time limit
 *     without freezing the page.
 */

import { JS_RUNTIME_SOURCE } from "./runtime";

export const SANDBOX_CSP =
  "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; style-src 'unsafe-inline'";

/** The code that runs inside the worker. */
const WORKER_SOURCE = `
const rt = ${JS_RUNTIME_SOURCE};
self.onmessage = async (e) => {
  const result = await rt.run(e.data, (line) => self.postMessage({ kind: "log", line }));
  self.postMessage({ kind: "done", result });
};
`;

/** The code that runs in the iframe: checks syntax, then hands the job to a worker. */
function frameMain(workerSource: string, runtimeSource: string) {
  // Find syntax errors WITH a line number by asking the browser to parse
  // the code inside a function that is never called.
  function checkSyntax(code: string) {
    let found: { name: string; message: string; line?: number } | null = null;
    const onError = (ev: ErrorEvent) => {
      found = {
        name: "SyntaxError",
        message: String(ev.message).replace(/^Uncaught SyntaxError: /, ""),
        line: ev.lineno ? Math.max(1, ev.lineno - 1) : undefined,
      };
      ev.preventDefault();
    };
    window.addEventListener("error", onError);
    const script = document.createElement("script");
    script.textContent = `(async function(){\n${code}\n})`;
    document.head.appendChild(script);
    script.remove();
    window.removeEventListener("error", onError);
    return found;
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    const job = event.data;
    if (!job || job.kind !== "run-js") return;
    const reply = (result: unknown) => window.parent.postMessage({ kind: "js-result", id: job.id, result }, "*");
    const emptyResults = () =>
      job.tests.map((t: { name: string }) => ({ name: t.name, passed: false, message: "Didn't run because of the error above" }));

    const syntaxError = checkSyntax(job.code);
    if (syntaxError) {
      reply({ logs: [], requests: [], results: emptyResults(), error: syntaxError });
      return;
    }

    const logs: unknown[] = [];
    let worker: Worker;
    try {
      worker = new Worker(URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" })));
    } catch {
      // Fallback (rare): run directly in the iframe. Still sealed off, but an
      // endless loop could freeze this tab.
      const rt = new Function(`return ${runtimeSource}`)();
      rt.run(job).then(reply);
      return;
    }
    const timer = setTimeout(() => {
      worker.terminate();
      reply({
        logs,
        requests: [],
        results: emptyResults(),
        error: { name: "TimeoutError", message: `Stopped after ${job.timeoutMs / 1000} seconds` },
      });
    }, job.timeoutMs);
    worker.onmessage = (e) => {
      if (e.data.kind === "log") {
        logs.push(e.data.line);
        return;
      }
      clearTimeout(timer);
      worker.terminate();
      reply(e.data.result);
    };
    worker.postMessage({ code: job.code, tests: job.tests, api: job.api });
  });

  window.parent.postMessage({ kind: "js-ready" }, "*");
}

/** Escape text so it can sit safely inside a <script> tag. */
const scriptSafe = (s: string) => s.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");

export function buildJsFrame(): string {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${SANDBOX_CSP}">
</head><body><script>
(${scriptSafe(frameMain.toString())})(${scriptSafe(JSON.stringify(WORKER_SOURCE))}, ${scriptSafe(JSON.stringify(JS_RUNTIME_SOURCE))});
</script></body></html>`;
}
