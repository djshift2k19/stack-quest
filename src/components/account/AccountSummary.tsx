"use client";

import Link from "next/link";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { supabaseConfigured } from "@/lib/sync/supabase";
import { describeSync } from "./AccountPanel";

/** A one-line "is my progress backed up?" card for the profile page. */
export function AccountSummary() {
  const { account, sync } = useProgress();
  if (!supabaseConfigured) return null;
  return (
    <section aria-labelledby="account-summary" className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="min-w-0 flex-1">
        <h2 id="account-summary" className="font-semibold">
          <span aria-hidden="true">☁️ </span>Account and sync
        </h2>
        <p className="text-sm text-muted">{account ? `${account.email}: ${describeSync(sync)}` : "Sign in to back up your progress and use it on all your devices."}</p>
      </div>
      <Link href="/account" className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm hover:bg-surface-2">
        {account ? "Manage" : "Sign in"}
      </Link>
      {account && (
        <Link href="/leaderboard" className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm hover:bg-surface-2">
          Leaderboard
        </Link>
      )}
    </section>
  );
}
