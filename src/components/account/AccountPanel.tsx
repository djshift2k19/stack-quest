"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { primaryButton, secondaryButton } from "@/components/exercises/ui";
import { useProgress, type SyncStatus } from "@/lib/progress/ProgressProvider";
import { deleteAccount, getLeaderboardProfile, saveLeaderboardProfile, signOut } from "@/lib/sync/account";
import { supabaseConfigured } from "@/lib/sync/supabase";
import { AuthForm } from "./AuthForm";

export function describeSync(sync: SyncStatus): string {
  switch (sync.kind) {
    case "off":
      return "Not syncing: you're not signed in.";
    case "syncing":
      return "Syncing…";
    case "synced":
      return `Synced at ${new Date(sync.at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}.`;
    case "offline":
      return "You're offline. Progress is saved on this device and will sync when you're back online.";
    case "error":
      return `Sync problem: ${sync.message}`;
  }
}

function LeaderboardSettings() {
  const [displayName, setDisplayName] = useState("");
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getLeaderboardProfile()
      .then((p) => {
        if (p) {
          setDisplayName(p.displayName);
          setShow(p.showOnLeaderboard);
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await saveLeaderboardProfile({ displayName, showOnLeaderboard: show });
      setMessage(show ? "Saved. You're on the leaderboard." : "Saved. You're not shown on the leaderboard.");
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  return (
    <section aria-labelledby="lb-heading" className="rounded-2xl border border-border bg-surface p-5">
      <h2 id="lb-heading" className="font-bold">
        Leaderboard (optional)
      </h2>
      <p className="mt-1 text-sm text-muted">
        Off unless you switch it on. Only your chosen display name and your XP are shown, to signed-in learners. Use a nickname
        if you prefer.
      </p>
      {ready && (
        <form onSubmit={save} className="mt-3 space-y-3">
          <label className="block text-sm font-semibold">
            Display name
            <input
              required
              minLength={2}
              maxLength={24}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-surface px-3"
            />
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="size-5 accent-[var(--accent)]" />
            Show me on the leaderboard
          </label>
          <button type="submit" className={secondaryButton}>
            Save leaderboard settings
          </button>
          <p aria-live="polite" className="text-sm">
            {message}
          </p>
        </form>
      )}
      <Link href="/leaderboard" className="mt-2 inline-block text-sm text-accent underline">
        View the leaderboard
      </Link>
    </section>
  );
}

function DangerZone() {
  const { syncNow } = useProgress();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <section aria-labelledby="delete-heading" className="rounded-2xl border border-border bg-surface p-5">
      <h2 id="delete-heading" className="font-bold">
        Delete my account
      </h2>
      <p className="mt-1 text-sm text-muted">
        Permanently deletes your login and all your progress stored online. Progress on this device stays until you reset it
        on your profile page.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        {!confirming ? (
          <button type="button" className={secondaryButton} onClick={() => setConfirming(true)}>
            Delete my account…
          </button>
        ) : (
          <>
            <button
              type="button"
              className="inline-flex min-h-11 items-center rounded-full bg-flame px-4 text-sm font-semibold text-white"
              onClick={async () => {
                try {
                  await deleteAccount();
                  await syncNow();
                } catch (err) {
                  setError((err as Error).message);
                }
              }}
            >
              Yes, delete everything online
            </button>
            <button type="button" className={secondaryButton} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-flame">{error}</p>}
    </section>
  );
}

export function AccountPanel() {
  const { account, sync, syncNow, loaded } = useProgress();

  if (!supabaseConfigured) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5" data-testid="accounts-not-configured">
        <h2 className="font-bold">Accounts aren&apos;t switched on yet</h2>
        <p className="mt-1 text-muted">
          Stack Quest works fully without an account: your progress is saved on this device. Accounts (to sync between your
          phone and laptop) need a Supabase project. See section 6 of the README.
        </p>
      </div>
    );
  }

  if (!loaded || sync.kind === "syncing") {
    if (!account) return <p className="text-muted">Checking your account…</p>;
  }

  if (!account) return <AuthForm />;

  return (
    <div className="space-y-4">
      <section aria-labelledby="signed-in-heading" className="rounded-2xl border border-border bg-surface p-5">
        <h2 id="signed-in-heading" className="font-bold">
          Signed in
        </h2>
        <p className="mt-1">
          <span className="text-muted">Email:</span> {account.email}
        </p>
        <p className="mt-2 text-sm" aria-live="polite" data-testid="sync-status">
          {describeSync(sync)}
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" className={primaryButton} onClick={() => void syncNow()} disabled={sync.kind === "syncing"}>
            Sync now
          </button>
          <button
            type="button"
            className={secondaryButton}
            onClick={async () => {
              await signOut();
              await syncNow();
            }}
          >
            Sign out
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">
          Signing out keeps your progress on this device. On a shared computer, also reset it on your profile page.
        </p>
      </section>
      <LeaderboardSettings />
      <DangerZone />
    </div>
  );
}
