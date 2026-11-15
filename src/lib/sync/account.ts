"use client";

/**
 * Everything to do with your account: signing up and in, passwords, the
 * opt-in leaderboard, and deleting your account. Supabase does the hard,
 * security-sensitive work (passwords are never seen or stored by Stack Quest).
 */

import { getSupabase } from "./supabase";

/** Supabase's messages, in plain English. */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match. Check for typos, or reset your password.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "There's already an account with that email. Try signing in instead.";
  if (m.includes("email not confirmed")) return "Please confirm your email first: open the link we sent you (check spam too).";
  if (m.includes("password should be at least") || m.includes("weak password"))
    return "Please choose a longer password: at least 8 characters, and a mix of words or numbers makes it stronger.";
  if (m.includes("rate limit")) return "Too many emails were sent recently. Please wait an hour and try again.";
  if (m.includes("unable to validate email") || m.includes("invalid email")) return "That doesn't look like a valid email address.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Couldn't reach the server. Check your connection and try again.";
  return message;
}

/** Run a Supabase call and turn any error into a friendly one. */
async function run<R extends { error: { message: string } | null }>(fn: () => PromiseLike<R>): Promise<R> {
  const result = await fn();
  if (result.error) throw new Error(friendlyAuthError(result.error.message));
  return result;
}

const here = (path: string) => `${window.location.origin}${path}`;

export async function signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }> {
  const supabase = await getSupabase();
  const { data } = await run(() => supabase.auth.signUp({ email, password, options: { emailRedirectTo: here("/account") } }));
  return { needsConfirmation: !data.session };
}

export async function signIn(email: string, password: string): Promise<void> {
  const supabase = await getSupabase();
  await run(() => supabase.auth.signInWithPassword({ email, password }));
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabase();
  await run(() => supabase.auth.signOut());
}

export async function sendPasswordReset(email: string): Promise<void> {
  const supabase = await getSupabase();
  await run(() => supabase.auth.resetPasswordForEmail(email, { redirectTo: here("/account/reset-password") }));
}

export async function updatePassword(password: string): Promise<void> {
  const supabase = await getSupabase();
  await run(() => supabase.auth.updateUser({ password }));
}

/** Waits for the sign-in that arrives with a password-reset email link. */
export async function hasSession(): Promise<boolean> {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

export interface LeaderboardProfile {
  displayName: string;
  showOnLeaderboard: boolean;
}

export async function getLeaderboardProfile(): Promise<LeaderboardProfile | null> {
  const supabase = await getSupabase();
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return null;
  const { data } = await run(() =>
    supabase.from("leaderboard_profiles").select("display_name, show_on_leaderboard").eq("user_id", s.session!.user.id).maybeSingle(),
  );
  return data ? { displayName: data.display_name, showOnLeaderboard: data.show_on_leaderboard } : null;
}

export async function saveLeaderboardProfile(profile: LeaderboardProfile): Promise<void> {
  const supabase = await getSupabase();
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) throw new Error("Please sign in first.");
  await run(() =>
    supabase.from("leaderboard_profiles").upsert({
      user_id: s.session!.user.id,
      display_name: profile.displayName.trim(),
      show_on_leaderboard: profile.showOnLeaderboard,
      updated_at: new Date().toISOString(),
    }),
  );
}

export async function getLeaderboard(): Promise<{ displayName: string; xp: number }[]> {
  const supabase = await getSupabase();
  const { data } = await run(() => supabase.rpc("get_leaderboard"));
  return ((data ?? []) as { display_name: string; xp: number }[]).map((r) => ({ displayName: r.display_name, xp: r.xp }));
}

/** Deletes the account and all its online data (POPIA: the right to deletion). */
export async function deleteAccount(): Promise<void> {
  const supabase = await getSupabase();
  await run(() => supabase.rpc("delete_my_account"));
  await supabase.auth.signOut({ scope: "local" });
}
