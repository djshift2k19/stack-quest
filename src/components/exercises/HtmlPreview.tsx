"use client";

import { useEffect, useState } from "react";
import { buildPreviewDocument, PREVIEW_SANDBOX, type PreviewInput } from "@/sandboxes/html/document";

/**
 * Live preview of the learner's page. It updates shortly after typing
 * stops (a "debounce"), so it doesn't flicker on every key press.
 */
export function HtmlPreview({ language, code, fixture }: Omit<PreviewInput, "tests" | "runId">) {
  const [doc, setDoc] = useState(() => buildPreviewDocument({ language, code, fixture }));

  useEffect(() => {
    const t = setTimeout(() => setDoc(buildPreviewDocument({ language, code, fixture })), 400);
    return () => clearTimeout(t);
  }, [language, code, fixture]);

  return (
    <div className="mt-4">
      <p className="mb-1 text-sm font-semibold">Live preview</p>
      <iframe
        title="Live preview of your page"
        sandbox={PREVIEW_SANDBOX}
        srcDoc={doc}
        className="h-72 w-full rounded-[10px] border border-border bg-white"
      />
    </div>
  );
}
