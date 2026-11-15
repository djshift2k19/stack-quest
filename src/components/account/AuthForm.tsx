"use client";

import { useState } from "react";
import { primaryButton, secondaryButton } from "@/components/exercises/ui";
import { sendPasswordReset, signIn, signUp } from "@/lib/sync/account";
import { useProgress } from "@/lib/progress/ProgressProvider";

type Mode = "sign-in" | "sign-up" | "forgot";

const inputClass = "mt-1 block min-h-11 w-full rounded-lg border border-border bg-surface px-3";

/** Sign in, create an account, or ask for a password-reset email. */
export function AuthForm() {
  const { syncNow } = useProgress();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "sign-in") {
        await signIn(email, password);
        await syncNow();
      } else if (mode === "sign-up") {
        if (password.length < 8) throw new Error("Please choose a password with at least 8 characters.");
        const { needsConfirmation } = await signUp(email, password);
        if (needsConfirmation) {
          setNotice(`Almost done! We sent a link to ${email}. Open it to confirm your account (check your spam folder too).`);
        } else {
          await syncNow();
        }
      } else {
        await sendPasswordReset(email);
        setNotice(`If there's an account for ${email}, a reset link is on its way.`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const titles: Record<Mode, string> = { "sign-in": "Sign in", "sign-up": "Create an account", forgot: "Reset your password" };

  return (
    <section aria-labelledby="auth-heading" className="rounded-2xl border border-border bg-surface p-5">
      <h2 id="auth-heading" className="text-lg font-bold">
        {titles[mode]}
      </h2>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <label className="block text-sm font-semibold">
          Email
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </label>
        {mode !== "forgot" && (
          <label className="block text-sm font-semibold">
            Password
            <input
              type="password"
              required
              minLength={mode === "sign-up" ? 8 : undefined}
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            {mode === "sign-up" && <span className="mt-1 block font-normal text-muted">At least 8 characters. A short sentence is easy to remember and hard to guess.</span>}
          </label>
        )}
        <div aria-live="polite">
          {error && (
            <p className="rounded-lg bg-surface-2 p-3 text-sm text-flame" data-testid="auth-error">
              {error}
            </p>
          )}
          {notice && <p className="rounded-lg bg-accent-soft p-3 text-sm">{notice}</p>}
        </div>
        <button type="submit" className={primaryButton} disabled={busy}>
          {busy ? "Please wait…" : titles[mode]}
        </button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {mode !== "sign-in" && (
          <button type="button" className={secondaryButton} onClick={() => setMode("sign-in")}>
            I have an account
          </button>
        )}
        {mode !== "sign-up" && (
          <button type="button" className={secondaryButton} onClick={() => setMode("sign-up")}>
            Create an account
          </button>
        )}
        {mode !== "forgot" && (
          <button type="button" className={secondaryButton} onClick={() => setMode("forgot")}>
            Forgot password?
          </button>
        )}
      </div>
    </section>
  );
}
