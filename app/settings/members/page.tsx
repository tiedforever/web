import { PageHeader } from "@/src/components/shared/page-header";
import { WorkspaceInvitationManagement } from "@/src/components/settings/workspace-invitation-management";
import { WeddingMembersList } from "@/src/components/settings/wedding-members-list";
import { Card } from "@/src/components/shared/ui";
import { WeddingRequiredState } from "@/src/components/shared/wedding-required-state";
import {
  listWeddingMembers,
} from "@/src/server/actions/wedding/wedding.actions";
import { listWeddingMemberInvitations } from "@/src/server/actions/wedding/workspace-invitation.actions";
import { getWeddingPageContext } from "@/src/server/auth/get-wedding-page-context";

export const metadata = {
  title: "Members",
};

export const dynamic = "force-dynamic";

export default async function MembersSettingsPage() {
  const context = await getWeddingPageContext();

  if (!context) {
    return <WeddingRequiredState feature="Wedding members" />;
  }

  const isOwner = context.role === "OWNER";
  const [memberResult, memberInvitationResult] = await Promise.all([
    listWeddingMembers(),
    isOwner ? listWeddingMemberInvitations() : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        description="Manage wedding members and invite owners, editors, or viewers."
        eyebrow="Workspace settings"
        title="Members"
      />
      <Card className="p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold text-[#1C1C1C]">Current members</h2>
          <p className="mt-1 text-sm leading-6 text-[#7A7A6E]">
            Active owners, editors, and viewers with access to this wedding.
          </p>
        </div>
        <div className="mt-5">
          {memberResult.success ? (
            <WeddingMembersList key={context.wedding.id} canManage={isOwner} currentUserId={context.user.id} members={memberResult.data} />
          ) : (
            <p className="rounded-lg bg-[#FFF5F3] px-3 py-2 text-sm text-[#9D3F32]">
              {memberResult.error}
            </p>
          )}
        </div>
      </Card>

      {isOwner ? (
        <Card className="p-5 sm:p-6">
          {memberInvitationResult && !memberInvitationResult.success ? (
            <p className="mb-4 rounded-lg bg-[#FFF5F3] px-3 py-2 text-sm text-[#9D3F32]">{memberInvitationResult.error}</p>
          ) : null}
          <WorkspaceInvitationManagement
            key={`${context.wedding.id}:${memberInvitationResult?.success ? memberInvitationResult.data.map((invitation) => `${invitation.id}-${invitation.status}`).join(",") : ""}`}
            initialMemberInvitations={
              memberInvitationResult?.success ? memberInvitationResult.data : []
            }
          />
        </Card>
      ) : (
        <Card className="p-5 sm:p-6">
          <p className="text-sm leading-6 text-[#7A7A6E]">
            Only wedding owners can invite or revoke workspace members.
          </p>
        </Card>
      )}
    </div>
  );
}
