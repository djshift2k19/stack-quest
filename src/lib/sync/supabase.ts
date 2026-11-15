"use client";

/**
 * The connection to Supabase (accounts and online progress).
 *
 * The two settings come from the local settings file (see README, section 6):
 *   NEXT_PUBLIC_SUPABASE_URL              your project's address
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  the "publishable" key
 *
 * Both are SAFE to be in the browser: they only identify the project. What
 * protects the data is the Row Level Security rules in supabase/schema.sql.
 * (Supabase's *secret* key must never be used here or shared.)
 *
 * The Supabase library (~50 KB) is only downloaded when it's needed: when
 * someone opens the account page, or is already signed in.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** False until the project's settings have been added. The app then stays local-only. */
export const supabaseConfigured = Boolean(url && key);

let clientPromise: Promise<SupabaseClient> | null = null;

export function getSupabase(): Promise<SupabaseClient> {
  if (!supabaseConfigured) return Promise.reject(new Error("Accounts aren't set up yet"));
  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }),
  );
  return clientPromise;
}

/**
 * A quick check, without downloading the library: does this browser hold a
 * saved sign-in? Supabase keeps it in localStorage as "sb-<project>-auth-token".
 */
export function hasStoredSession(): boolean {
  if (!supabaseConfigured) return false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? "";
      if (k.startsWith("sb-") && k.endsWith("-auth-token")) return true;
    }
    // Arriving from an email link ("confirm your account" or "reset password").
    return /access_token=|[?&]code=/.test(window.location.hash + window.location.search);
  } catch {
    return false;
  }
}
