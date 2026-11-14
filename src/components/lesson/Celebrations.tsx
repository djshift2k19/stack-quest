"use client";

import Link from "next/link";
import { allBadges } from "@/lib/gamification/badges";
import type { Celebration } from "@/lib/gamification/progress";
import { useProgress } from "@/lib/progress/ProgressProvider";

/** The short "well done" list after finishing a unit. */
export function CelebrationList({ celebrations }: { celebrations: Celebration[] }) {
  const { catalog } = useProgress();
  const badgeLookup = new Map(allBadges(catalog).map((b) => [b.id, b]));
  const messages = celebrations.map((c) => {
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
    <div>
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
        <p className="mt-1 text-muted" data-testid="celebrations">
          You&apos;ve already earned the XP for this one, and practising again is always worth it.
        </p>
      )}
    </div>
  );
}

export function NextLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 font-semibold text-accent-contrast hover:opacity-90"
    >
      {label} →
    </Link>
  );
}
