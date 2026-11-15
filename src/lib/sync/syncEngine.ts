"use client";

/**
 * Syncing: combine this device's progress with the copy saved online.
 *
 *   1. Download the online copy (if there is one).
 *   2. Merge it with this device's copy (see merge.ts: nothing is lost).
 *   3. Upload the merged result if the online copy was missing something.
 *
 * The merged result is returned, so this device can save it too.
 */

import { initialProgress, normaliseProgress, type ProgressState } from "@/lib/gamification/progress";
import { mergeProgress, sameProgress } from "./merge";
import { getSupabase } from "./supabase";

export interface SyncResult {
  email: string;
  merged: ProgressState;
}

/** Returns null when nobody is signed in. */
export async function syncWithServer(local: ProgressState): Promise<SyncResult | null> {
  const supabase = await getSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return null;

  const { data, error } = await supabase.from("progress").select("data").eq("user_id", user.id).maybeSingle();
  if (error) throw new Error(error.message);

  const remote = data ? normaliseProgress(data.data) : initialProgress;
  const merged = mergeProgress(local, remote);

  if (!data || !sameProgress(merged, remote)) {
    const { error: saveError } = await supabase
      .from("progress")
      .upsert({ user_id: user.id, data: merged, xp: merged.xp, updated_at: new Date().toISOString() });
    if (saveError) throw new Error(saveError.message);
  }
  return { email: user.email ?? "", merged };
}

/** Replace the online copy completely (used by "Reset my progress"). */
export async function overwriteOnline(progress: ProgressState): Promise<void> {
  const supabase = await getSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return;
  const { error } = await supabase
    .from("progress")
    .upsert({ user_id: user.id, data: progress, xp: progress.xp, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
