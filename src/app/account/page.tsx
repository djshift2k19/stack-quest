import type { Metadata } from "next";
import { AccountPanel } from "@/components/account/AccountPanel";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Account and sync</h1>
      <p className="text-muted">
        Optional. With an account, your progress is backed up and shared between your devices, for example your phone and your
        MacBook.
      </p>
      <AccountPanel />
    </div>
  );
}
