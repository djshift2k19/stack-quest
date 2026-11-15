"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { primaryButton } from "@/components/exercises/ui";
import { hasSession, updatePassword } from "@/lib/sync/account";
import { supabaseConfigured } from "@/lib/sync/supabase";

/** Opened from the "reset your password" email link. */
export function ResetPassword() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;
    // The email link signs you in briefly; give the library a moment to read it.
    const timer = setTimeout(() => hasSession().then(setReady, () => setReady(false)), 500);
    return () => clearTimeout(timer);
  }, []);

  if (ready === false || !supabaseConfigured) {
    return <p>This reset link has expired or was already used. Request a new one from the account page.</p>;
  }
  if (ready === null) return <p className="text-muted">Checking your reset link…</p>;
  if (done) {
    return (
      <p>
        ✅ Password changed. <Link href="/account" className="text-accent underline">Go to your account</Link>
      </p>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          if (password.length < 8) throw new Error("Please choose a password with at least 8 characters.");
          await updatePassword(password);
          setDone(true);
        } catch (err) {
          setMessage((err as Error).message);
        }
      }}
    >
      <label className="block text-sm font-semibold">
        New password
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-surface px-3"
        />
      </label>
      <p aria-live="polite" className="text-sm text-flame">
        {message}
      </p>
      <button type="submit" className={primaryButton}>
        Save new password
      </button>
    </form>
  );
}
