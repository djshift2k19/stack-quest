import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CompletePanel } from "@/components/lesson/CompletePanel";
import { getCatalog, getUnit } from "@/lib/content/loader";
import { renderMdx } from "@/lib/content/render";

export async function generateStaticParams() {
  return (await getCatalog()).trails.flatMap((t) =>
    t.modules.flatMap((m) => m.units.map((u) => ({ trail: t.id, module: m.id, unit: u.id }))),
  );
}

export async function generateMetadata({ params }: PageProps<"/trails/[trail]/[module]/[unit]">): Promise<Metadata> {
  const p = await params;
  return { title: (await getUnit(p.trail, p.module, p.unit))?.meta.title ?? "Unit not found" };
}

export default async function UnitPage({ params }: PageProps<"/trails/[trail]/[module]/[unit]">) {
  const p = await params;
  const unit = await getUnit(p.trail, p.module, p.unit);
  const catalog = await getCatalog();
  const trail = catalog.trails.find((t) => t.id === p.trail);
  const mod = trail?.modules.find((m) => m.id === p.module);
  if (!unit || !trail || !mod) notFound();

  const index = mod.units.findIndex((u) => u.key === unit.key);
  const previous = mod.units[index - 1];
  const next = mod.units[index + 1];
  const content = await renderMdx(unit.body);

  return (
    <article>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: trail.title, href: `/trails/${trail.id}` },
          { label: mod.title, href: `/trails/${mod.key}` },
        ]}
      />
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Unit {index + 1} of {mod.units.length} · {unit.meta.minutes} min · {unit.meta.xp} XP
        </p>
        <h1 className="mt-1 text-3xl font-bold">{unit.meta.title}</h1>
        <div className="mt-4 rounded-xl border border-border bg-surface p-4">
          <p className="text-sm font-semibold">In this unit you&apos;ll learn to:</p>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {unit.meta.goals.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      </header>

      {unit.meta.type === "reading" ? (
        <div className="lesson">{content}</div>
      ) : (
        <p className="rounded-xl border border-border bg-surface-2 p-4">
          This kind of unit (<strong>{unit.meta.type}</strong>) needs the lesson engine, which arrives in Phase 2.
        </p>
      )}

      {unit.meta.type === "reading" && (
        <CompletePanel unitKey={unit.key} baseXp={unit.meta.xp} nextHref={next ? `/trails/${next.key}` : `/trails/${mod.key}`} nextLabel={next ? `Next: ${next.title}` : "Back to module"} />
      )}

      <nav aria-label="Unit navigation" className="mt-8 flex flex-wrap justify-between gap-3 border-t border-border pt-4 text-sm">
        {previous ? (
          <Link href={`/trails/${previous.key}`} className="inline-flex min-h-11 items-center hover:underline">
            ← {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/trails/${next.key}`} className="inline-flex min-h-11 items-center hover:underline">
            {next.title} →
          </Link>
        )}
      </nav>
    </article>
  );
}
