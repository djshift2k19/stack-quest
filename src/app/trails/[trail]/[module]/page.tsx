import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ModuleContinue, ModuleRing, UnitStatus } from "@/components/ProgressBits";
import { getCatalog } from "@/lib/content/loader";

// Real lessons are built ahead of time (generateStaticParams). Any other
// address is checked when it's visited and gets the 404 page, so it's fine
// for those to wait ("block") instead of showing a loading placeholder.
export const instant = false;

export async function generateStaticParams() {
  return (await getCatalog()).trails.flatMap((t) => t.modules.map((m) => ({ trail: t.id, module: m.id })));
}

async function findModule(trailId: string, moduleId: string) {
  const trail = (await getCatalog()).trails.find((t) => t.id === trailId);
  const mod = trail?.modules.find((m) => m.id === moduleId);
  return trail && mod ? { trail, module: mod } : undefined;
}

export async function generateMetadata({ params }: PageProps<"/trails/[trail]/[module]">): Promise<Metadata> {
  const p = await params;
  return { title: (await findModule(p.trail, p.module))?.module.title ?? "Module not found" };
}

const TYPE_LABELS: Record<string, string> = {
  reading: "Reading",
  quiz: "Quiz",
  "predict-output": "Predict the output",
  "fix-the-bug": "Fix the bug",
  "type-the-code": "Type the code",
  "build-it": "Build it",
  boss: "Boss Challenge",
  terminal: "Practice terminal",
};

export default async function ModulePage({ params }: PageProps<"/trails/[trail]/[module]">) {
  const p = await params;
  const found = await findModule(p.trail, p.module);
  if (!found) notFound();
  const { trail, module: mod } = found;

  return (
    <div>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: trail.title, href: `/trails/${trail.id}` }, { label: mod.title }]} />
      <header className="mb-6 flex items-center gap-4">
        <ModuleRing moduleKey={mod.key} size={72} />
        <div>
          <h1 className="text-2xl font-bold">{mod.title}</h1>
          <p className="mt-1 text-muted">{mod.summary}</p>
        </div>
      </header>

      <section aria-labelledby="goals" className="mb-6 rounded-2xl border border-border bg-surface p-4">
        <h2 id="goals" className="font-semibold">
          By the end of this module you&apos;ll be able to:
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {mod.goals.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">
          Badge: <span aria-hidden="true">{mod.badge.emoji}</span> {mod.badge.name}
        </p>
      </section>

      <div className="mb-6">
        <ModuleContinue moduleKey={mod.key} />
      </div>

      <section aria-labelledby="units">
        <h2 id="units" className="mb-3 text-lg font-bold">
          Units
        </h2>
        <ol className="space-y-2">
          {mod.units.map((u) => (
            <li key={u.key}>
              <Link
                href={`/trails/${u.key}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 hover:border-accent"
              >
                <UnitStatus unitKey={u.key} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{u.title}</span>
                  <span className="block text-xs text-muted">
                    {TYPE_LABELS[u.type] ?? u.type} · {u.minutes} min · {u.xp} XP
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
