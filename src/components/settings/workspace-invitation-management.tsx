"use client";

import { useState, useTransition } from "react";
import { weddingMemberRoles, getWeddingMemberRoleLabel, type WeddingMemberRoleValue } from "@/src/types/wedding-member-role";

import { ConfirmDialog } from "@/src/components/shared/confirm-dialog";
import {
  createWeddingMemberInvitation,
  listWeddingMemberInvitations,
  resendWeddingMemberInvitation,
  revokeWeddingMemberInvitation,
  type WeddingMemberInvitationListItem,
} from "@/src/server/actions/wedding/workspace-invitation.actions";

export function WorkspaceInvitationManagement({
  initialMemberInvitations,
}: {
  initialMemberInvitations: WeddingMemberInvitationListItem[];
}) {
  const [memberInvitations, setMemberInvitations] = useState(initialMemberInvitations);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WeddingMemberRoleValue>("EDITOR");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [developmentWorkspaceInvitationUrl, setDevelopmentWorkspaceInvitationUrl] = useState<string | null>(null);
  const [revokeInvitation, setRevokeInvitation] = useState<WeddingMemberInvitationListItem | null>(null);
  const [isPending, startTransition] = useTransition();

  function clearFeedback() {
    setMessage(null);
    setError(null);
    setDevelopmentWorkspaceInvitationUrl(null);
  }

  async function refreshMemberInvitations() {
    try {
      const result = await listWeddingMemberInvitations();
      if (!result.success) return false;
      setMemberInvitations(result.data);
      return true;
    } catch {
      return false;
    }
  }

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();

    startTransition(async () => {
      try {
        const result = await createWeddingMemberInvitation({ email, role });

        if (!result.success) {
          setError(result.error);
          return;
        }

        setEmail("");
        setMessage(result.data.message);
        setDevelopmentWorkspaceInvitationUrl(result.data.developmentWorkspaceInvitationUrl);
        if (!(await refreshMemberInvitations())) {
          setError("Invitation sent, but the invitation list could not be refreshed. Please reload.");
        }
      } catch {
        setError("Unable to send the member invitation. Please try again.");
      }
    });
  }

  function handleResend(id: string) {
    clearFeedback();

    startTransition(async () => {
      try {
        const result = await resendWeddingMemberInvitation(id);

        if (!result.success) {
          setError(result.error);
          return;
        }

        setMessage(result.data.message);
        setDevelopmentWorkspaceInvitationUrl(result.data.developmentWorkspaceInvitationUrl);
        if (!(await refreshMemberInvitations())) {
          setError("Invitation resent, but the invitation list could not be refreshed. Please reload.");
        }
      } catch {
        setError("Unable to resend the member invitation. Please try again.");
      }
    });
  }

  function handleRevoke(id: string) {
    clearFeedback();

    startTransition(async () => {
      try {
        const result = await revokeWeddingMemberInvitation(id);

        if (!result.success) {
          setRevokeInvitation(null);
          setError(result.error);
          return;
        }

        setMemberInvitations((current) =>
          current.map((memberInvitation) =>
            memberInvitation.id === id
              ? { ...memberInvitation, status: "REVOKED", revokedAt: new Date().toISOString() }
              : memberInvitation,
          ),
        );
        setRevokeInvitation(null);
        setMessage("The member invitation was revoked.");
      } catch {
        setRevokeInvitation(null);
        setError("Unable to revoke the member invitation. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[#1C1C1C]">Invite a wedding member</h2>
        <p className="mt-1 text-sm leading-6 text-[#7A7A6E]">
          Invite someone to your wedding workspace and choose their access. Invitations expire after seven days.
        </p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleCreate}>
        <input
          aria-label="Member invitation email"
          className="min-w-0 flex-1 rounded-[10px] border border-[#E4E0D4] bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
          maxLength={254}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="member@example.com"
          required
          type="email"
          value={email}
        />
        <select
          aria-label="Member invitation role"
          className="rounded-[10px] border border-[#E4E0D4] bg-white px-3.5 py-3 text-sm focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
          disabled={isPending}
          onChange={(event) => setRole(event.target.value as WeddingMemberRoleValue)}
          value={role}
        >
          {weddingMemberRoles.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <button
          className="rounded-[10px] bg-[#2D5A27] px-4 py-3 text-sm font-semibold text-white hover:bg-[#245020] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Working…" : "Send invitation"}
        </button>
      </form>
      <p className="text-sm text-[#7A7A6E]">{weddingMemberRoles.find((option) => option.value === role)?.description}</p>

      {error ? <p aria-live="polite" className="rounded-lg bg-[#FFF5F3] px-3 py-2 text-sm text-[#9D3F32]">{error}</p> : null}
      {message ? (
        <div aria-live="polite" className="rounded-lg bg-[#EAF0E8] px-3 py-2 text-sm text-[#2D5A27]">
          <p>{message}</p>
          {developmentWorkspaceInvitationUrl ? (
            <a className="mt-1 inline-block break-all font-medium underline" href={developmentWorkspaceInvitationUrl}>
              Open development workspace invitation link
            </a>
          ) : null}
        </div>
      ) : null}

      {memberInvitations.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-[#D9D6C9] px-4 py-5 text-sm text-[#7A7A6E]">
          No workspace member invitations have been sent for this wedding.
        </p>
      ) : (
        <ul className="divide-y divide-[#EEECE4] rounded-[12px] border border-[#E4E0D4]">
          {memberInvitations.map((memberInvitation) => {
            const canResend = memberInvitation.status !== "ACCEPTED";
            const canRevoke = memberInvitation.status === "PENDING";

            return (
              <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" key={memberInvitation.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#1C1C1C]">{memberInvitation.invitedEmail}</p>
                  <p className="mt-1 text-xs text-[#7A7A6E]">
                    {getWeddingMemberRoleLabel(memberInvitation.role)} · {memberInvitation.status} · expires {formatDate(memberInvitation.expiresAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {canResend ? (
                    <button className="rounded-lg border border-[#D9D6C9] px-3 py-2 text-xs font-semibold text-[#3F413A] disabled:opacity-50" disabled={isPending} onClick={() => handleResend(memberInvitation.id)} type="button">
                      Resend
                    </button>
                  ) : null}
                  {canRevoke ? (
                    <button className="rounded-lg border border-[#E7C9C5] px-3 py-2 text-xs font-semibold text-[#9D3F32] disabled:opacity-50" disabled={isPending} onClick={() => setRevokeInvitation(memberInvitation)} type="button">
                      Revoke
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        confirmLabel="Revoke invitation"
        description={`The invitation for ${revokeInvitation?.invitedEmail ?? "this email address"} will stop working. They will need a new invitation to join this wedding.`}
        onClose={() => setRevokeInvitation(null)}
        onConfirm={() => {
          if (revokeInvitation) handleRevoke(revokeInvitation.id);
        }}
        open={revokeInvitation !== null}
        pending={isPending}
        title="Revoke workspace invitation?"
      />
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}
