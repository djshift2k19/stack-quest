"use client";

/**
 * Tiny pieces that show progress inside otherwise-static pages.
 * The page itself is built ahead of time; these fill in your personal
 * progress once the browser has read it from storage.
 */

import Link from "next/link";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { moduleFraction, trailFraction, unitDone, unitHref } from "@/lib/progress/selectors";
import { ProgressRing } from "./ProgressRing";

export function UnitStatus({ unitKey }: { unitKey: string }) {
  const { state } = useProgress();
  const done = unitDone(state, unitKey);
  return (
    <span
      className={`grid size-7 shrink-0 place-items-center rounded-full border text-sm ${
        done ? "border-accent bg-accent text-accent-contrast" : "border-border text-muted"
      }`}
    >
      <span aria-hidden="true">{done ? "✓" : ""}</span>
      <span className="sr-only">{done ? "Completed" : "Not started"}</span>
    </span>
  );
}

export function ModuleRing({ moduleKey, size }: { moduleKey: string; size?: number }) {
  const { state, catalog } = useProgress();
  const mod = catalog.trails.flatMap((t) => t.modules).find((m) => m.key === moduleKey);
  return <ProgressRing fraction={mod ? moduleFraction(state, mod) : 0} label="Module progress" size={size} />;
}

export function TrailRing({ trailId, size }: { trailId: string; size?: number }) {
  const { state, catalog } = useProgress();
  const trail = catalog.trails.find((t) => t.id === trailId);
  return <ProgressRing fraction={trail ? trailFraction(state, trail) : 0} label="Trail progress" size={size} />;
}

/** "Start" or "Continue" button for the first unfinished unit in a module. */
export function ModuleContinue({ moduleKey }: { moduleKey: string }) {
  const { state, catalog } = useProgress();
  const mod = catalog.trails.flatMap((t) => t.modules).find((m) => m.key === moduleKey);
  if (!mod || mod.units.length === 0) return null;
  const next = mod.units.find((u) => !unitDone(state, u.key));
  const started = mod.units.some((u) => unitDone(state, u.key));
  const target = next ?? mod.units[0];
  return (
    <Link
      href={unitHref(target.key)}
      className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 font-semibold text-accent-contrast hover:opacity-90"
    >
      {!next ? "Review module" : started ? `Continue: ${next.title}` : "Start module"}
    </Link>
  );
}
