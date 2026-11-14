"use client";

import { useState } from "react";
import type { Celebration } from "@/lib/gamification/progress";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { CelebrationList, NextLink } from "./Celebrations";

/**
 * The bottom of a reading unit: "Mark as complete", then a short
 * celebration of what you earned. No timers and no pressure.
 */
export function CompletePanel({
  unitKey,
  baseXp,
  nextHref,
  nextLabel,
}: {
  unitKey: string;
  baseXp: number;
  nextHref: string;
  nextLabel: string;
}) {
  const { state, completeUnit, loaded } = useProgress();
  const [celebrations, setCelebrations] = useState<Celebration[] | null>(null);
  const [saving, setSaving] = useState(false);
  const record = state.units[unitKey];

  async function handleComplete() {
    setSaving(true);
    setCelebrations(await completeUnit({ unitKey, baseXp }));
    setSaving(false);
  }

  return (
    <section aria-label="Finish this unit" className="mt-10 rounded-2xl border border-border bg-surface p-5">
      {/* role="status" makes screen readers announce the celebration. */}
      <div role="status" aria-live="polite">
        {celebrations && (
          <div className="mb-4">
            <CelebrationList celebrations={celebrations} />
          </div>
        )}
      </div>

      {!celebrations && record && (
        <p className="mb-3 text-muted">
          <span aria-hidden="true">✓ </span>You finished this unit on {new Date(record.firstCompletedAt).toLocaleDateString("en-ZA")}.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {!celebrations && !record && (
          <button
            type="button"
            onClick={handleComplete}
            disabled={!loaded || saving}
            className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 font-semibold text-accent-contrast hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Mark as complete"}
          </button>
        )}
        {(celebrations || record) && <NextLink href={nextHref} label={nextLabel} />}
      </div>
    </section>
  );
}
