"use client";

import { FormEvent, useRef, useState, useTransition, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  createHouseholdWithMembers,
  type HouseholdActionResult,
  type HouseholdData,
} from "@/src/server/actions/guests/household.actions";
import type { HouseholdListTag } from "@/src/server/repositories/household-list.repository";
import { Button, Input, Select } from "@/src/components/shared/ui";
import { Modal } from "@/src/components/shared/modal";
import { ConfirmDialog } from "@/src/components/shared/confirm-dialog";
import { invalidateGuestsAndDashboardQueries } from "./guest-query-cache";

const MAX_MEMBERS = 20;

type MemberDraft = {
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ageGroup: string;
  dietaryRequirements: string;
  notes: string;
  tagIds: string[];
};

function emptyMember(): MemberDraft {
  return {
    title: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    ageGroup: "ADULT",
    dietaryRequirements: "",
    notes: "",
    tagIds: [],
  };
}

export function HouseholdCreationModal({
  open,
  onClose,
  tags,
  weddingId,
}: {
  open: boolean;
  onClose: () => void;
  tags: HouseholdListTag[];
  weddingId: string;
}) {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState(1);
  const [members, setMembers] = useState<MemberDraft[]>([emptyMember()]);
  const [pendingMemberCount, setPendingMemberCount] = useState<number | null>(null);

  function reset() {
    formRef.current?.reset();
    setError(null);
    setMemberCount(1);
    setMembers([emptyMember()]);
    setPendingMemberCount(null);
  }

  function close() {
    reset();
    onClose();
  }

  function changeMemberCount(nextValue: number) {
    const nextCount = Math.min(MAX_MEMBERS, Math.max(1, nextValue));
    if (nextCount < members.length) {
      const discarded = members.slice(nextCount).some(hasMemberDetails);
      if (discarded) {
        setPendingMemberCount(nextCount);
        return;
      }
    }

    setMemberCount(nextCount);
    setMembers((current) =>
      Array.from({ length: nextCount }, (_, index) => current[index] ?? emptyMember()),
    );
  }

  function updateMember(index: number, patch: Partial<MemberDraft>) {
    setMembers((current) =>
      current.map((member, memberIndex) =>
        memberIndex === index ? { ...member, ...patch } : member,
      ),
    );
  }

  function confirmMemberCountChange() {
    if (pendingMemberCount === null) return;
    setMemberCount(pendingMemberCount);
    setMembers((current) =>
      current.slice(0, pendingMemberCount),
    );
    setPendingMemberCount(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result: HouseholdActionResult<HouseholdData> = await createHouseholdWithMembers({
          name: formData.get("name"),
          addressLineOne: formData.get("addressLineOne"),
          addressLineTwo: formData.get("addressLineTwo"),
          townCity: formData.get("townCity"),
          countyRegion: formData.get("countyRegion"),
          postcode: formData.get("postcode"),
          country: formData.get("country"),
          notes: formData.get("notes"),
          memberCount,
          members,
        });

        if (!result.success) {
          setError(result.error);
          return;
        }

        reset();
        onClose();
        void invalidateGuestsAndDashboardQueries(queryClient, weddingId);
      } catch {
        setError("Unable to create household. Please try again.");
      }
    });
  }

  return (
    <>
      <Modal
        description="Create a shared address and add its household members together."
        onClose={close}
        open={open && pendingMemberCount === null}
        title="Add household"
      >
        <form className="space-y-6" onSubmit={submit} ref={formRef}>
        <section className="space-y-4">
          <SectionHeading title="Shared address" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field defaultValue="" label="Household name" maxLength={150} name="name" required />
            <Field defaultValue="United Kingdom" label="Country" maxLength={100} name="country" required />
            <Field defaultValue="" label="Address line one" maxLength={200} name="addressLineOne" required />
            <Field defaultValue="" label="Address line two" maxLength={200} name="addressLineTwo" />
            <Field defaultValue="" label="Town or city" maxLength={100} name="townCity" required />
            <Field defaultValue="" label="County or region" maxLength={100} name="countyRegion" />
            <Field defaultValue="" label="Postcode" maxLength={30} name="postcode" required />
          </div>
          <TextArea defaultValue="" label="Notes" maxLength={2000} name="notes" />
        </section>

        <section className="space-y-4 border-t border-[#F0EFEA] pt-6">
          <div className="flex items-end justify-between gap-4">
            <SectionHeading title="Household members" />
            <label className="grid shrink-0 gap-1.5 text-xs font-medium text-[#6B6B63]">
              People
              <Input
                className="w-20"
                max={MAX_MEMBERS}
                min={1}
                onChange={(event) => changeMemberCount(Number(event.target.value))}
                type="number"
                value={memberCount}
              />
            </label>
          </div>
          <p className="text-xs leading-5 text-[#8A8A82]">
            The first person is the primary invitee by default. Children and shared-email households do not need separate email addresses.
          </p>

          <div className="space-y-4">
            {members.map((member, index) => (
              <MemberFields
                index={index}
                key={index}
                member={member}
                onChange={(patch) => updateMember(index, patch)}
                tags={tags}
              />
            ))}
          </div>
        </section>

        {error ? <p aria-live="polite" className="text-sm text-[#9D3F32]">{error}</p> : null}
        <div className="flex justify-end gap-2 border-t border-[#F0EFEA] pt-4">
          <Button disabled={isPending} onClick={close} type="button" variant="ghost">Cancel</Button>
          <Button disabled={isPending} type="submit" variant="primary">
            {isPending ? "Creating…" : "Create household"}
          </Button>
        </div>
        </form>
      </Modal>
      <ConfirmDialog
        confirmLabel="Reduce household"
        description="The removed member details will be discarded from this draft."
        onClose={() => setPendingMemberCount(null)}
        onConfirm={confirmMemberCountChange}
        open={pendingMemberCount !== null}
        title="Reduce household size?"
      />
    </>
  );
}

function MemberFields({
  index,
  member,
  onChange,
  tags,
}: {
  index: number;
  member: MemberDraft;
  onChange: (patch: Partial<MemberDraft>) => void;
  tags: HouseholdListTag[];
}) {
  const primary = index === 0;
  return (
    <div className="rounded-xl border border-[#E8E8E3] bg-[#FAFAF8] p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EAF0E8] text-xs font-semibold text-[#2D5A27]">{index + 1}</span>
        <h3 className="text-sm font-semibold text-[#1C1C1C]">{primary ? "Primary invitee" : `Household member ${index + 1}`}</h3>
        {primary ? <span className="rounded-full bg-[#EAF0E8] px-2 py-1 text-[10px] font-semibold text-[#2D5A27]">Primary</span> : null}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {primary ? <Field defaultValue={member.title} label="Title" maxLength={30} name={`member-${index}-title`} onChange={(event) => onChange({ title: event.target.value })} /> : null}
        <Field defaultValue={member.firstName} label="First name" maxLength={100} name={`member-${index}-firstName`} onChange={(event) => onChange({ firstName: event.target.value })} required />
        <Field defaultValue={member.lastName} label="Last name" maxLength={100} name={`member-${index}-lastName`} onChange={(event) => onChange({ lastName: event.target.value })} required />
        <Field defaultValue={member.email} label="Email" maxLength={254} name={`member-${index}-email`} onChange={(event) => onChange({ email: event.target.value })} type="email" />
        <Field defaultValue={member.phone} label="Phone" maxLength={50} name={`member-${index}-phone`} onChange={(event) => onChange({ phone: event.target.value })} />
        <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">
          Age group
          <Select onChange={(event) => onChange({ ageGroup: event.target.value })} value={member.ageGroup}>
            <option value="ADULT">Adult</option>
            <option value="CHILD">Child</option>
            <option value="INFANT">Infant</option>
          </Select>
        </label>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <TextArea defaultValue={member.dietaryRequirements} label="Dietary requirements" maxLength={2000} name={`member-${index}-dietaryRequirements`} onChange={(event) => onChange({ dietaryRequirements: event.target.value })} />
        <TextArea defaultValue={member.notes} label="Notes" maxLength={2000} name={`member-${index}-notes`} onChange={(event) => onChange({ notes: event.target.value })} />
      </div>
      <fieldset className="mt-4">
        <legend className="text-xs font-medium text-[#6B6B63]">Tags</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.length > 0 ? tags.map((tag) => {
            const selected = member.tagIds.includes(tag.id);
            return (
              <label className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${selected ? "border-[#2D5A27] bg-[#EAF0E8] text-[#2D5A27]" : "border-[#E8E8E3] text-[#6B6B63]"}`} key={tag.id}>
                <input
                  checked={selected}
                  className="sr-only"
                  onChange={() => onChange({ tagIds: selected ? member.tagIds.filter((id) => id !== tag.id) : [...member.tagIds, tag.id] })}
                  type="checkbox"
                />
                {tag.name}
              </label>
            );
          }) : <span className="text-xs text-[#8A8A82]">No tags created yet.</span>}
        </div>
      </fieldset>
    </div>
  );
}

function hasMemberDetails(member: MemberDraft) {
  return [
    member.title,
    member.firstName,
    member.lastName,
    member.email,
    member.phone,
    member.dietaryRequirements,
    member.notes,
    ...member.tagIds,
  ].some((value) => value.trim().length > 0);
}

function SectionHeading({ title }: { title: string }) {
  return <h3 className="text-sm font-semibold text-[#1C1C1C]">{title}</h3>;
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required = false,
  maxLength,
  onChange,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">
      {label}
      <Input defaultValue={defaultValue} maxLength={maxLength} name={name} onChange={onChange} required={required} type={type} />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  maxLength,
  onChange,
}: {
  label: string;
  name: string;
  defaultValue: string;
  maxLength?: number;
  onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">
      {label}
      <textarea className="min-h-20 rounded-[10px] border border-[#E8E8E3] bg-white px-3 py-2 text-sm outline-none focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]" defaultValue={defaultValue} maxLength={maxLength} name={name} onChange={onChange} />
    </label>
  );
}
