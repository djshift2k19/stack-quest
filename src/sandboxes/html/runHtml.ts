"use client";

import type { RunResult } from "../types";
import { buildPreviewDocument, type PreviewInput } from "./document";

let counter = 0;

/** Load the learner's page in a hidden sealed iframe, run the checks, and return the results. */
export function runHtmlTests(input: Omit<PreviewInput, "runId">, timeoutMs = 4000): Promise<RunResult> {
  const id = ++counter;
  const tests = input.tests ?? [];
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.setAttribute("aria-hidden", "true");
    iframe.tabIndex = -1;
    // Give it a real size so layout and styles can be measured.
    iframe.style.cssText = "position:fixed;left:-10000px;top:0;width:800px;height:600px;border:0;";

    const finish = (result: RunResult) => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
      iframe.remove();
      resolve(result);
    };
    const timer = setTimeout(
      () =>
        finish({
          logs: [],
          requests: [],
          results: tests.map((t) => ({ name: t.name, passed: false, message: "Didn't finish" })),
          error: { name: "TimeoutError", message: `Stopped after ${timeoutMs / 1000} seconds` },
        }),
      timeoutMs,
    );
    function onMessage(event: MessageEvent) {
      if (event.source !== iframe.contentWindow) return;
      if (event.data?.kind === "html-result" && event.data.id === id) finish(event.data.result as RunResult);
    }
    window.addEventListener("message", onMessage);
    // Attach the frame and let it get its 800 x 600 size BEFORE loading the
    // page. Otherwise, on a busy device, the checks can run while the frame
    // is still 0 pixels wide, so layouts and media queries measure wrongly.
    document.body.appendChild(iframe);
    void iframe.offsetWidth;
    iframe.srcdoc = buildPreviewDocument({ ...input, tests, runId: id });
  });
}
