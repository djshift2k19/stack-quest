import type { Metadata } from "next";
import { getGlossary } from "@/lib/content/loader";

export const metadata: Metadata = { title: "Glossary" };

export default async function GlossaryPage() {
  const glossary = await getGlossary();
  return (
    <div>
      <h1 className="text-2xl font-bold">Glossary</h1>
      <p className="mt-1 text-muted">Every technical word in Stack Quest, in plain English. Tap an underlined word in any lesson to see its entry.</p>
      <dl className="mt-6 space-y-3">
        {glossary.map((g) => (
          <div key={g.id} id={g.id} className="scroll-mt-4 rounded-xl border border-border bg-surface p-4 target:border-accent target:bg-accent-soft">
            <dt className="font-bold">{g.term}</dt>
            <dd className="mt-1">{g.definition}</dd>
            {g.example && (
              <dd className="mt-1 text-sm text-muted">
                <strong>Example:</strong> {g.example}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}
