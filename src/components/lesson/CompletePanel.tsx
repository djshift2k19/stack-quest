"use client";

import Link from "next/link";
import { useState } from "react";
import { allBadges } from "@/lib/gamification/badges";
import type { Celebration } from "@/lib/gamification/progress";
import { useProgress } from "@/lib/progress/ProgressProvider";

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
  const { state, catalog, completeUnit, loaded } = useProgress();
  const [celebrations, setCelebrations] = useState<Celebration[] | null>(null);
  const [saving, setSaving] = useState(false);
  const record = state.units[unitKey];

  async function handleComplete() {
    setSaving(true);
    setCelebrations(await completeUnit({ unitKey, baseXp }));
    setSaving(false);
  }

  const badgeLookup = new Map(allBadges(catalog).map((b) => [b.id, b]));
  const messages = (celebrations ?? []).map((c) => {
    switch (c.kind) {
      case "xp":
        return { icon: "✨", text: `+${c.amount} XP${c.noHintBonus ? " (includes a no-hint bonus!)" : ""}` };
      case "level-up":
        return { icon: "⬆️", text: `Level up! You're now level ${c.level}.` };
      case "badge": {
        const badge = badgeLookup.get(c.badgeId);
        return { icon: badge?.emoji ?? "🏅", text: `Badge earned: ${badge?.name ?? c.badgeId}` };
      }
      case "streak":
        return { icon: "🔥", text: `Streak: ${c.current} day${c.current === 1 ? "" : "s"}` };
      case "freeze-used":
        return { icon: "🧊", text: `A streak freeze covered ${c.count} missed day${c.count === 1 ? "" : "s"}. Your streak is safe.` };
      case "freeze-earned":
        return { icon: "🧊", text: "You earned a streak freeze for finishing a module." };
    }
  });

  return (
    <section aria-label="Finish this unit" className="mt-10 rounded-2xl border border-border bg-surface p-5">
      {/* role="status" makes screen readers announce the celebration. */}
      <div role="status" aria-live="polite">
        {celebrations && (
          <div className="mb-4">
            <p className="text-lg font-bold">Nice work! 🎉</p>
            {messages.length > 0 ? (
              <ul className="mt-2 space-y-1" data-testid="celebrations">
                {messages.map((m, i) => (
                  <li key={i} className="flex gap-2 motion-safe:animate-[pop_0.4s_ease-out]">
                    <span aria-hidden="true">{m.icon}</span>
                    <span>{m.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-muted">You&apos;ve already earned the XP for this one, and reviewing is always worth it.</p>
            )}
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
        {(celebrations || record) && (
          <Link
            href={nextHref}
            className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 font-semibold text-accent-contrast hover:opacity-90"
          >
            {nextLabel} →
          </Link>
        )}
      </div>
    </section>
  );
}
