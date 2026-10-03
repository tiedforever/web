"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/src/components/shared/confirm-dialog";
import { removeMember } from "@/src/server/actions/wedding/wedding-member.actions";
import type { WeddingMemberListItem } from "@/src/server/actions/wedding/wedding.actions";

export function WeddingMembersList({
  members,
  canManage = false,
  currentUserId,
}: {
  members: WeddingMemberListItem[];
  canManage?: boolean;
  currentUserId?: string;
}) {
  const router = useRouter();
  const [selectedMember, setSelectedMember] = useState<WeddingMemberListItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmRemoval() {
    if (!selectedMember) return;
    const member = selectedMember;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await removeMember(member.id);
        setSelectedMember(null);
        if (!result.success) {
          setError(result.error);
          return;
        }
        setMessage(`${member.firstName || member.email} no longer has access to this wedding.`);
        router.refresh();
      } catch {
        setSelectedMember(null);
        setError("Unable to remove this member. Please try again.");
      }
    });
  }

  if (members.length === 0) {
    return (
      <p className="rounded-[10px] border border-dashed border-[#D9D6C9] px-4 py-5 text-sm text-[#7A7A6E]">
        No active members were found for this wedding.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {canManage ? <p className="text-sm text-[#7A7A6E]">Owners can remove other members, including owners. The wedding must retain at least one active owner.</p> : null}
      {error ? <p aria-live="polite" className="text-sm text-[#9D3F32]">{error}</p> : null}
      {message ? <p aria-live="polite" className="text-sm text-[#2D5A27]">{message}</p> : null}
      <ul className="divide-y divide-[#EEECE4] rounded-[12px] border border-[#E4E0D4]">
        {members.map((member) => {
          const name = `${member.firstName} ${member.lastName}`.trim();

          return (
            <li
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              key={member.id}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF0E8] text-xs font-semibold text-[#2D5A27]">
                  {getInitials(member.firstName, member.lastName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#1C1C1C]">
                    {name || member.email}
                  </p>
                  <p className="truncate text-xs text-[#7A7A6E]">{member.email}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs text-[#7A7A6E]">
                <span className="rounded-full bg-[#F4F4F1] px-2.5 py-1 font-semibold uppercase tracking-[0.08em] text-[#5D6057]">
                  {member.role}
                </span>
                {member.joinedAt ? <span>Joined {formatDate(member.joinedAt)}</span> : null}
                {canManage && currentUserId && member.userId !== currentUserId ? (
                  <button
                    aria-label={`Remove ${name || member.email}`}
                    className="rounded-lg border border-[#E7C9C5] px-3 py-2 font-semibold text-[#9D3F32] disabled:opacity-50"
                    disabled={pending}
                    onClick={() => { setError(null); setMessage(null); setSelectedMember(member); }}
                    type="button"
                  >Remove</button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        confirmLabel="Remove member"
        description={`${selectedMember?.firstName ?? "This member"} will lose access to this wedding. Their account and the wedding's plans will remain.${selectedMember?.role === "OWNER" ? " They will also lose all owner permissions." : ""}`}
        onClose={() => setSelectedMember(null)}
        onConfirm={confirmRemoval}
        open={selectedMember !== null}
        pending={pending}
        title={selectedMember?.role === "OWNER" ? "Remove this wedding owner?" : "Remove this wedding member?"}
      />
    </div>
  );
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "?";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}
