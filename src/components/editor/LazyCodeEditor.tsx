"use client";

import dynamic from "next/dynamic";

/** Loads the editor only when it's first shown. */
export const LazyCodeEditor = dynamic(() => import("./CodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-[120px] place-items-center rounded-[10px] border border-border bg-surface-2 text-sm text-muted">
      Loading the code editor…
    </div>
  ),
});
