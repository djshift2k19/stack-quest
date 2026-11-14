import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ModuleRing, TrailRing } from "@/components/ProgressBits";
import { getCatalog } from "@/lib/content/loader";

// Real lessons are built ahead of time (generateStaticParams). Any other
// address is checked when it's visited and gets the 404 page, so it's fine
// for those to wait ("block") instead of showing a loading placeholder.
export const instant = false;

// Build one page per trail ahead of time.
export async function generateStaticParams() {
  return (await getCatalog()).trails.map((t) => ({ trail: t.id }));
}

async function findTrail(id: string) {
  return (await getCatalog()).trails.find((t) => t.id === id);
}

export async function generateMetadata({ params }: PageProps<"/trails/[trail]">): Promise<Metadata> {
  const trail = await findTrail((await params).trail);
  return { title: trail?.title ?? "Trail not found" };
}

export default async function TrailPage({ params }: PageProps<"/trails/[trail]">) {
  const trail = await findTrail((await params).trail);
  if (!trail) notFound();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: trail.title }]} />
      <header className="mb-6 flex items-center gap-4">
        {trail.status === "available" && <TrailRing trailId={trail.id} size={72} />}
        <div>
          <h1 className="text-2xl font-bold">{trail.title}</h1>
          <p className="mt-1 text-muted">{trail.summary}</p>
        </div>
      </header>

      {trail.status === "coming-soon" ? (
        <section aria-labelledby="outline">
          <p className="mb-4 rounded-xl border border-border bg-surface-2 p-3 text-sm">
            <strong>Coming soon.</strong> This trail is planned but not written yet. Here&apos;s what it will cover.
          </p>
          <h2 id="outline" className="mb-3 text-lg font-bold">
            Planned modules
          </h2>
          <ol className="space-y-3">
            {trail.plannedModules.map((m) => (
              <li key={m.title} className="rounded-2xl border border-border bg-surface p-4">
                <h3 className="font-semibold">{m.title}</h3>
                {m.goals.length > 0 && <p className="mt-1 text-sm text-muted">{m.goals.join(" ")}</p>}
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {m.units.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <section aria-labelledby="modules">
          <h2 id="modules" className="mb-3 text-lg font-bold">
            Modules
          </h2>
          <ol className="space-y-3">
            {trail.modules.map((m, i) => (
              <li key={m.key}>
                <Link
                  href={`/trails/${m.key}`}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 hover:border-accent"
                >
                  <ModuleRing moduleKey={m.key} />
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
                      Module {i + 1} · {m.units.length} units · {m.units.reduce((sum, u) => sum + u.minutes, 0)} min
                    </span>
                    <span className="block font-semibold">{m.title}</span>
                    <span className="block text-sm text-muted">{m.summary}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
