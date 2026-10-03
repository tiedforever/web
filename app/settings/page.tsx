import Link from "next/link";

import { SignOutControl } from "@/src/components/auth/sign-out-button";
import { DeleteWeddingForm } from "@/src/components/settings/delete-wedding-form";
import { WeddingRequiredState } from "@/src/components/shared/wedding-required-state";
import { Card } from "@/src/components/shared/ui";
import { getWeddingPageContext } from "@/src/server/auth/get-wedding-page-context";
import { getAuthenticatedUser } from "@/src/server/auth/get-authenticated-user";

export const metadata = {
  title: "Settings",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const context = await getWeddingPageContext();
  const user = context?.user ?? (await getAuthenticatedUser()).user;
  const isOwner = context?.role === "OWNER";

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2D5A27]">
          Account & workspace
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#1C1C1C]">
          Settings
        </h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-6 text-[#7A7A6E]">
          Manage your account access and the current wedding workspace.
        </p>
      </header>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#1C1C1C]">Account</h2>
            <p className="mt-1 text-sm text-[#7A7A6E]">
              Signed in as {user.email}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex items-center justify-center rounded-[10px] border border-[#E4E0D4] bg-white px-4 py-2 text-sm font-medium text-[#1C1C1C] transition hover:border-[#C9DCC5] hover:bg-[#F7FBF5]"
              href="/settings/account"
            >
              Account settings
            </Link>
            <SignOutControl />
          </div>
        </div>
      </Card>

      {!context ? (
        <WeddingRequiredState feature="Wedding workspace settings" />
      ) : null}

      {context ? (
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-semibold text-[#1C1C1C]">Members and invitations</h2>
          <p className="mt-1 text-sm text-[#7A7A6E]">See who has access to your wedding and manage member invitations.</p>
          <Link className="mt-4 inline-flex rounded-[10px] border border-[#E4E0D4] px-4 py-2 text-sm font-medium text-[#2D5A27]" href="/settings/members">Manage members</Link>
        </Card>
      ) : null}

      {isOwner && context ? (
        <Card className="border-[#E7C9C5] bg-[#FFF8F6] p-5 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#9D3F32]">
            Danger zone
          </p>
          <h2 className="mt-2 text-lg font-semibold text-[#5C211B]">
            Delete {context.wedding.name}
          </h2>
          <DeleteWeddingForm key={context.wedding.id} weddingName={context.wedding.name} />
        </Card>
      ) : null}
    </div>
  );
}
