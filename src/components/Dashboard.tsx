"use client";

import Link from "next/link";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { nextUnit, unitHref } from "@/lib/progress/selectors";
import { TrailRing } from "./ProgressBits";
import { StatsBar } from "./StatsBar";

export function Dashboard() {
  const { state, catalog, loaded, persistent } = useProgress();
  const next = nextUnit(state, catalog);
  const isNew = Object.keys(state.units).length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{isNew ? "Welcome to Stack Quest 👋" : "Welcome back 👋"}</h1>
        <p className="mt-1 text-muted">
          From “what is a file?” to building full-stack apps, in short units of 10 minutes or less.
        </p>
      </div>

      {!persistent && (
        <p role="status" className="rounded-xl border border-gold/40 bg-gold-soft p-3 text-sm">
          This browser won&apos;t let Stack Quest save, so progress will be lost when you close the tab. Private browsing
          windows often do this.
        </p>
      )}

      <StatsBar />

      {loaded && next && (
        <section aria-labelledby="next-heading" className="rounded-2xl border border-accent/40 bg-accent-soft p-4">
          <h2 id="next-heading" className="text-sm font-semibold text-accent">
            {isNew ? "Start here" : "Pick up where you left off"}
          </h2>
          <p className="mt-1 text-lg font-semibold">{next.title}</p>
          <p className="text-sm text-muted">
            {next.minutes} min · {next.xp} XP
          </p>
          <Link
            href={unitHref(next.key)}
            className="mt-3 inline-flex min-h-11 items-center rounded-full bg-accent px-5 font-semibold text-accent-contrast hover:opacity-90"
          >
            {isNew ? "Start your first unit" : "Continue"}
          </Link>
        </section>
      )}

      <section aria-labelledby="trails-heading">
        <h2 id="trails-heading" className="mb-3 text-lg font-bold">
          Trails
        </h2>
        <ul className="space-y-3">
          {catalog.trails.map((trail, index) => (
            <li key={trail.id}>
              <Link
                href={`/trails/${trail.id}`}
                className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 hover:border-accent"
              >
                {trail.status === "available" ? (
                  <TrailRing trailId={trail.id} />
                ) : (
                  <span className="grid size-14 shrink-0 place-items-center rounded-full bg-surface-2 text-2xl" aria-hidden="true">
                    {trail.badge.emoji}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
                    {trail.id === "how-this-app-works" ? "Special trail" : `Trail ${index + 1}`}
                    {trail.status === "coming-soon" && " · Coming soon"}
                  </span>
                  <span className="block font-semibold">{trail.title}</span>
                  <span className="block text-sm text-muted">{trail.summary}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
