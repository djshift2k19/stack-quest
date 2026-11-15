import type { Metadata } from "next";
import { ResetPassword } from "@/components/account/ResetPassword";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Choose a new password</h1>
      <ResetPassword />
    </div>
  );
}
