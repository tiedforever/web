import { redirect } from "next/navigation";

import { DeleteAccountForm } from "@/src/components/settings/delete-account-form";
import { Card } from "@/src/components/shared/ui";
import {
  AuthenticationRequiredError,
  getAuthenticatedUser,
} from "@/src/server/auth/get-authenticated-user";

export const metadata = {
  title: "Account",
};

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  let user;

  try {
    ({ user } = await getAuthenticatedUser());
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect("/sign-in");
    }

    throw error;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2D5A27]">
          Account settings
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#1C1C1C]">
          Account
        </h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-6 text-[#7A7A6E]">
          Manage your Tied Forever account and permanent account deletion.
        </p>
      </header>

      <Card className="border-[#E7C9C5] bg-[#FFF8F6] p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#9D3F32]">
          Danger zone
        </p>
        <h2 className="mt-2 text-lg font-semibold text-[#5C211B]">
          Delete your account
        </h2>
        <p className="mt-1 text-sm text-[#7A4A43]">
          Signed in as {user.email}.
        </p>
        <DeleteAccountForm />
      </Card>
    </div>
  );
}
