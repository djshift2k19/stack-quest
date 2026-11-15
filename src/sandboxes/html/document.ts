/**
 * Builds the page shown in the HTML/CSS live preview.
 *
 * The learner's HTML is placed in a sealed iframe (sandbox without
 * allow-same-origin) with a Content Security Policy that blocks all
 * network requests. Two small helpers are added:
 *   - links and forms are stopped from navigating away (which could
 *     otherwise load real websites and use data)
 *   - when checking, a test script runs after the page has loaded and
 *     reports pass/fail back to Stack Quest
 */

import type { ChallengeTest } from "@/lib/content/schema";
import { JS_RUNTIME_SOURCE } from "../js/runtime";

export const PREVIEW_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; script-src 'unsafe-inline' 'unsafe-eval'";

const scriptSafe = (s: string) => s.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");

const STAY_PUT = `<script>
document.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest("a"); if (a) e.preventDefault(); });
document.addEventListener("submit", function (e) { e.preventDefault(); });
</script>`;

function testScript(tests: Pick<ChallengeTest, "name" | "code">[], runId: number) {
  return `<script>
window.addEventListener("load", function () {
  // Wait (up to 1 second) until the frame has a real width, so layout and
  // media-query checks measure the page at its proper size.
  var waited = 0;
  (function whenSized() {
    if (window.innerWidth === 0 && waited < 1000) { waited += 20; setTimeout(whenSized, 20); return; }
    var rt = ${scriptSafe(JS_RUNTIME_SOURCE)};
    rt.run({ code: "", tests: ${scriptSafe(JSON.stringify(tests))} }).then(function (result) {
      window.parent.postMessage({ kind: "html-result", id: ${runId}, result: result }, "*");
    });
  })();
});
</script>`;
}

/** Put `snippet` inside <head>, keeping any <!doctype> first. */
export function injectIntoHead(html: string, snippet: string): string {
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => `${m}${snippet}`);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => `${m}<head>${snippet}</head>`);
  const doctype = html.match(/^\s*<!doctype[^>]*>/i);
  if (doctype) return `${doctype[0]}<head>${snippet}</head>${html.slice(doctype[0].length)}`;
  return `<!doctype html><head>${snippet}</head>${html}`;
}

export function injectBeforeBodyEnd(html: string, snippet: string): string {
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${snippet}</body>`) : `${html}${snippet}`;
}

export interface PreviewInput {
  language: "html" | "css";
  /** The learner's code. */
  code: string;
  /** For CSS: the HTML being styled. */
  fixture?: string;
  /** When given, the page checks itself and reports results. */
  tests?: Pick<ChallengeTest, "name" | "code">[];
  runId?: number;
}

export function buildPreviewDocument({ language, code, fixture, tests, runId = 0 }: PreviewInput): string {
  const page = language === "css" ? injectIntoHead(fixture ?? "", `<style>${code.replace(/<\/style/gi, "")}</style>`) : code;
  const head = `<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}"><meta name="viewport" content="width=device-width, initial-scale=1">`;
  let doc = injectIntoHead(page, head);
  doc = injectBeforeBodyEnd(doc, STAY_PUT + (tests ? testScript(tests, runId) : ""));
  return doc;
}
