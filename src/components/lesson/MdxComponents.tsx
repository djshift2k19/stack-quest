/**
 * The special building blocks lesson writers can use inside .mdx files,
 * e.g. <Analogy title="...">...</Analogy>. See CONTENT_GUIDE.md.
 */

import type { ReactNode } from "react";

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
 * A glossary term. In Phase 1 it's simply highlighted; in Phase 2 tapping
 * it will show the definition from content/glossary.yaml.
 */
export function Term({ word, children }: { word: string; children: ReactNode }) {
  return (
    <span data-term={word} className="underline decoration-accent decoration-dotted underline-offset-4">
      {children}
    </span>
  );
}

export const mdxComponents = { Analogy, KeyIdea, Term };
