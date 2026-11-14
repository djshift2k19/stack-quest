/**
 * The special building blocks lesson writers can use inside .mdx files,
 * e.g. <Analogy title="...">...</Analogy>. See CONTENT_GUIDE.md.
 */

import type { ReactNode } from "react";
import type { GlossaryEntry } from "@/lib/content/schema";

export function Analogy({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <aside className="rounded-xl border border-gold/40 bg-gold-soft p-4" aria-label="Everyday analogy">
      <p className="mb-1 text-sm font-semibold text-gold">
        <span aria-hidden="true">💡 </span>
        {title ? `Analogy: ${title}` : "Analogy"}
      </p>
      <div className="[&>*+*]:mt-2">{children}</div>
    </aside>
  );
}

export function KeyIdea({ children }: { children: ReactNode }) {
  return (
    <aside className="rounded-xl border-l-4 border-accent bg-accent-soft p-4" aria-label="Key idea">
      <p className="mb-1 text-sm font-semibold text-accent">
        <span aria-hidden="true">🔑 </span>Key idea
      </p>
      <div className="[&>*+*]:mt-2">{children}</div>
    </aside>
  );
}

/**
 * Makes the <Term> block for one lesson. Tapping a term opens a small card
 * with its definition from content/glossary.yaml. It uses the browser's
 * built-in "popover" feature, so it works without extra JavaScript, closes
 * with Escape or a tap outside, and screen readers announce it.
 */
export function makeTerm(glossary: GlossaryEntry[]) {
  const byId = new Map(glossary.map((g) => [g.id, g]));
  let count = 0;

  return function Term({ word, children }: { word: string; children: ReactNode }) {
    const entry = byId.get(word);
    if (!entry) return <>{children}</>;
    const id = `term-${word}-${++count}`;
    return (
      <>
        <button
          type="button"
          popoverTarget={id}
          className="cursor-help underline decoration-accent decoration-dotted decoration-2 underline-offset-4 hover:bg-accent-soft"
          aria-label={`${typeof children === "string" ? children : entry.term}: show definition`}
        >
          {children}
        </button>
        <span
          id={id}
          popover="auto"
          role="dialog"
          aria-label={`Definition of ${entry.term}`}
          className="m-auto max-w-sm rounded-2xl border border-border bg-surface p-4 text-left text-base leading-normal text-text shadow-xl backdrop:bg-black/30"
        >
          <span className="block font-bold">{entry.term}</span>
          <span className="mt-1 block">{entry.definition}</span>
          {entry.example && (
            <span className="mt-2 block text-sm text-muted">
              <strong>Example:</strong> {entry.example}
            </span>
          )}
          <span className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <a href={`/glossary#${entry.id}`} className="text-sm text-accent underline">
              All terms
            </a>
            <button type="button" popoverTarget={id} popoverTargetAction="hide" className="min-h-11 rounded-full border border-border px-4 text-sm">
              Close
            </button>
          </span>
        </span>
      </>
    );
  };
}

export function mdxComponents(glossary: GlossaryEntry[]) {
  return { Analogy, KeyIdea, Term: makeTerm(glossary) };
}
