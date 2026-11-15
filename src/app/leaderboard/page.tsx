import type { Metadata } from "next";
import { Leaderboard } from "@/components/account/Leaderboard";

export const metadata: Metadata = { title: "Leaderboard" };

export default function LeaderboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Leaderboard</h1>
      <p className="text-muted">
        Just for fun, and entirely optional. Everyone learns at their own pace, so compare yourself with yesterday&apos;s you
        first.
      </p>
      <Leaderboard />
    </div>
  );
}
