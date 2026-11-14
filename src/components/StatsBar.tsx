"use client";

import { displayedStreak } from "@/lib/gamification/streak";
import { levelProgress } from "@/lib/gamification/xp";
import { useProgress } from "@/lib/progress/ProgressProvider";

/** Level, XP bar, streak and freezes: the learner's "scoreboard". */
export function StatsBar() {
  const { state, loaded } = useProgress();
  const level = levelProgress(state.xp);
  // Only check today's date once progress has loaded in the browser,
  // never while the page is being built ahead of time.
  const streak = loaded ? displayedStreak(state.streak, new Date()) : 0;

  return (
    <section aria-label="Your stats" className="rounded-2xl border border-border bg-surface p-4" aria-busy={!loaded}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-56">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-semibold">
              Level {level.level} <span className="font-normal text-muted">· {level.title}</span>
            </p>
            <p className="text-sm text-muted" data-testid="xp-total">
              {state.xp} XP
            </p>
          </div>
          <div
            className="mt-2 h-3 overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-label={`Progress to level ${level.level + 1}`}
            aria-valuemin={0}
            aria-valuemax={level.levelSize}
            aria-valuenow={level.intoLevel}
          >
            <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${level.fraction * 100}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted">
            {level.levelSize - level.intoLevel} XP to level {level.level + 1}
          </p>
        </div>
        <div className="flex gap-4">
          <p className="text-center">
            <span className="block text-2xl" aria-hidden="true">
              🔥
            </span>
            <span className="block text-sm font-semibold" data-testid="streak">
              {streak} day{streak === 1 ? "" : "s"}
            </span>
            <span className="block text-xs text-muted">streak</span>
          </p>
          <p className="text-center">
            <span className="block text-2xl" aria-hidden="true">
              🧊
            </span>
            <span className="block text-sm font-semibold">{state.streak.freezes}</span>
            <span className="block text-xs text-muted">freezes</span>
          </p>
        </div>
      </div>
    </section>
  );
}
