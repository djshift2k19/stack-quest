"use client";

/**
 * Runs learner JavaScript in a fresh sealed iframe and waits for the result.
 * A new iframe each time means every run starts clean.
 */

import type { JsJob, RunResult } from "../types";
import { buildJsFrame } from "./frame";

export const JS_TIME_LIMIT_MS = 3000;

let frameHtml: string | undefined;
let counter = 0;

export function runJs(job: JsJob, timeoutMs = JS_TIME_LIMIT_MS): Promise<RunResult> {
  frameHtml ??= buildJsFrame();
  const id = ++counter;

  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts"); // no allow-same-origin!
    iframe.setAttribute("aria-hidden", "true");
    iframe.tabIndex = -1;
    iframe.style.display = "none";
    iframe.srcdoc = frameHtml!;

    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(safetyTimer);
      iframe.remove();
    };

    // Backup timer in case the whole iframe gets stuck.
    const safetyTimer = setTimeout(() => {
      cleanup();
      resolve({
        logs: [],
        requests: [],
        results: job.tests.map((t) => ({ name: t.name, passed: false, message: "Didn't finish" })),
        error: { name: "TimeoutError", message: `Stopped after ${timeoutMs / 1000} seconds` },
      });
    }, timeoutMs + 2000);

    function onMessage(event: MessageEvent) {
      // Only listen to our own iframe.
      if (event.source !== iframe.contentWindow) return;
      const data = event.data;
      if (data?.kind === "js-ready") {
        iframe.contentWindow?.postMessage({ kind: "run-js", id, timeoutMs, ...job }, "*");
      } else if (data?.kind === "js-result" && data.id === id) {
        cleanup();
        resolve(data.result as RunResult);
      }
    }

    window.addEventListener("message", onMessage);
    document.body.appendChild(iframe);
  });
}
