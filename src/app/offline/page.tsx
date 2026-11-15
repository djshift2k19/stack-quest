import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Offline" };

/** Shown when you're offline and open a page that hasn't been saved yet. */
export default function OfflinePage() {
  return (
    <div className="py-12 text-center">
      <p className="text-5xl" aria-hidden="true">
        📴
      </p>
      <h1 className="mt-4 text-2xl font-bold">This page isn&apos;t saved for offline yet</h1>
      <p className="mx-auto mt-2 max-w-md text-muted">
        You&apos;re offline, and this page hasn&apos;t been opened on this device before. Pages you&apos;ve already
        visited still work. Next time you have Wi-Fi, use <strong>Save all lessons for offline</strong> on your profile
        page.
      </p>
      <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-accent px-5 font-semibold text-accent-contrast">
        Back to the dashboard
      </Link>
    </div>
  );
}
