"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { getLeaderboard } from "@/lib/sync/account";
import { supabaseConfigured } from "@/lib/sync/supabase";

/** The opt-in leaderboard: only learners who chose to appear, by display name. */
export function Leaderboard() {
  const { account } = useProgress();
  const [rows, setRows] = useState<{ displayName: string; xp: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!account) return;
    getLeaderboard().then(setRows, (err: Error) => setError(err.message));
  }, [account]);

  if (!supabaseConfigured || !account) {
    return (
      <p className="text-muted">
        The leaderboard is for signed-in learners who choose to join. <Link href="/account" className="text-accent underline">Sign in or create an account</Link>.
      </p>
    );
  }
  if (error) return <p className="text-flame">{error}</p>;
  if (!rows) return <p className="text-muted">Loading…</p>;
  if (rows.length === 0) return <p className="text-muted">Nobody has joined yet. Switch it on from your account page to be the first!</p>;

  return (
    <ol className="divide-y divide-border rounded-2xl border border-border bg-surface" data-testid="leaderboard">
      {rows.map((r, i) => (
        <li key={i} className="flex items-center gap-3 p-3">
          <span className="w-8 text-center font-bold text-muted">{i + 1}</span>
          <span className="flex-1">{r.displayName}</span>
          <span className="font-semibold">{r.xp} XP</span>
        </li>
      ))}
    </ol>
  );
}
