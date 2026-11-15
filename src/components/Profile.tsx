"use client";

import { useState } from "react";
import { allUnits } from "@/lib/content/catalog";
import { allBadges } from "@/lib/gamification/badges";
import { MAX_FREEZES } from "@/lib/gamification/streak";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { OfflineSaver } from "./offline/OfflineSaver";
import { StatsBar } from "./StatsBar";

export function Profile() {
  const { state, catalog, resetProgress } = useProgress();
  const [confirming, setConfirming] = useState(false);
  const badges = allBadges(catalog);
  const earnedCount = badges.filter((b) => state.badges[b.id]).length;
  const units = allUnits(catalog);
  const done = units.filter((u) => state.units[u.key]).length;
  const minutes = units.filter((u) => state.units[u.key]).reduce((sum, u) => sum + u.minutes, 0);

  const stats = [
    { label: "Units finished", value: `${done} of ${units.length}` },
    { label: "Learning time", value: `about ${minutes} min` },
    { label: "Longest streak", value: `${state.streak.longest} day${state.streak.longest === 1 ? "" : "s"}` },
    { label: "Streak freezes", value: `${state.streak.freezes} of ${MAX_FREEZES}` },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Your profile</h1>
      <StatsBar />

      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="mb-3 text-lg font-bold">
          Stats
        </h2>
        <dl className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-surface p-3">
              <dt className="text-xs text-muted">{s.label}</dt>
              <dd className="font-semibold">{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-sm text-muted">
          You get one free streak freeze each week, and another for every module you finish. A freeze covers a day you
          miss, so your streak survives.
        </p>
      </section>

      <section aria-labelledby="badges-heading">
        <h2 id="badges-heading" className="mb-3 text-lg font-bold">
          Badges <span className="text-sm font-normal text-muted">({earnedCount} of {badges.length})</span>
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {badges.map((b) => {
            const earnedAt = state.badges[b.id];
            return (
              <li
                key={b.id}
                className={`rounded-xl border p-3 text-center ${earnedAt ? "border-gold/50 bg-gold-soft" : "border-border bg-surface"}`}
              >
                <span aria-hidden="true" className={`block text-3xl ${earnedAt ? "" : "opacity-30 grayscale"}`}>
                  {b.emoji}
                </span>
                <span className="mt-1 block text-sm font-semibold">{b.name}</span>
                <span className="block text-xs text-muted">
                  {earnedAt ? `Earned ${new Date(earnedAt).toLocaleDateString("en-ZA")}` : `Not yet: ${b.howToEarn}`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <OfflineSaver />

      <section aria-labelledby="reset-heading" className="rounded-xl border border-border bg-surface p-4">
        <h2 id="reset-heading" className="font-semibold">
          Start over
        </h2>
        <p className="mt-1 text-sm text-muted">
          Resetting erases your progress on this device and can&apos;t be undone.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm hover:bg-surface-2"
            >
              Reset my progress…
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={async () => {
                  await resetProgress();
                  setConfirming(false);
                }}
                className="inline-flex min-h-11 items-center rounded-full bg-flame px-4 text-sm font-semibold text-white"
              >
                Yes, erase everything
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm hover:bg-surface-2"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
