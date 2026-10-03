"use client";

import { FormEvent, useRef, useState, useTransition, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { createGuest, type GuestActionResult, type GuestActionData } from "@/src/server/actions/guests/guest.actions";
import type { HouseholdData } from "@/src/server/actions/guests/household.actions";
import type { GuestListTag } from "@/src/server/repositories/guest-list.repository";
import type { GuestListSection } from "@/src/server/repositories/guest-list.repository";
import { Button, Input, Select } from "@/src/components/shared/ui";
import { Modal } from "@/src/components/shared/modal";
import { ConfirmDialog } from "@/src/components/shared/confirm-dialog";
import { GuestSectionSelector } from "./guest-section-selector";
import { invalidateGuestsAndDashboardQueries } from "./guest-query-cache";

type PlusOneDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ageGroup: string;
  dietaryRequirements: string;
  notes: string;
};

const emptyPlusOne: PlusOneDraft = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  ageGroup: "ADULT",
  dietaryRequirements: "",
  notes: "",
};

export function GuestCreationModal({
  open,
  onClose,
  households,
  sections,
  tags,
  lockedHouseholdId,
  weddingId,
}: {
  open: boolean;
  onClose: () => void;
  households: Pick<HouseholdData, "id" | "name">[];
  sections: GuestListSection[];
  tags: GuestListTag[];
  lockedHouseholdId?: string;
  weddingId: string;
}) {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [plusOneOpen, setPlusOneOpen] = useState(false);
  const [plusOneDraft, setPlusOneDraft] = useState<PlusOneDraft>(emptyPlusOne);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedPlusOneSections, setSelectedPlusOneSections] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState<"close" | "collapse" | null>(null);

  function close() {
    if (hasPlusOneDraft(plusOneDraft, selectedPlusOneSections)) {
      setConfirmation("close");
      return;
    }
    performClose();
  }

  function performClose() {
    formRef.current?.reset();
    setError(null);
    setPlusOneOpen(false);
    setPlusOneDraft(emptyPlusOne);
    setSelectedSections([]);
    setSelectedPlusOneSections([]);
    setConfirmation(null);
    onClose();
  }

  function togglePlusOne() {
    if (plusOneOpen && hasPlusOneDraft(plusOneDraft, selectedPlusOneSections)) {
      setConfirmation("collapse");
      return;
    }

    setPlusOneOpen((current) => !current);
    if (plusOneOpen) {
      setPlusOneDraft(emptyPlusOne);
      setSelectedPlusOneSections([]);
    }
  }

  function confirmDiscard() {
    if (confirmation === "close") {
      performClose();
      return;
    }

    setPlusOneOpen(false);
    setPlusOneDraft(emptyPlusOne);
    setSelectedPlusOneSections([]);
    setConfirmation(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const tagIds = formData
      .getAll("tagIds")
      .filter((tagId): tagId is string => typeof tagId === "string");

    startTransition(async () => {
      try {
        const result: GuestActionResult<GuestActionData> = await createGuest({
          title: formData.get("title"),
          firstName: formData.get("firstName"),
          lastName: formData.get("lastName"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          ageGroup: formData.get("ageGroup"),
          householdId: lockedHouseholdId ?? formData.get("householdId"),
          dietaryRequirements: formData.get("dietaryRequirements"),
          notes: formData.get("notes"),
          tagIds,
          sectionIds: selectedSections,
          plusOne: plusOneOpen
            ? { ...plusOneDraft, sectionIds: selectedPlusOneSections }
            : undefined,
        });

        if (!result.success) {
          setError(result.error);
          return;
        }

        form.reset();
        setPlusOneDraft(emptyPlusOne);
        setSelectedPlusOneSections([]);
        setPlusOneOpen(false);
        performClose();
        void invalidateGuestsAndDashboardQueries(queryClient, weddingId);
      } catch {
        setError("Unable to add guest. Please try again.");
      }
    });
  }

  return (
    <>
      <Modal
        description="Add a primary guest and optionally their plus-one."
        onClose={close}
        open={open && confirmation === null}
        title="Add guest"
      >
        <form className="space-y-5" onSubmit={submit} ref={formRef}>
        <div className="grid gap-4 sm:grid-cols-[100px_1fr_1fr]">
          <Field defaultValue="" label="Title" name="title" maxLength={30} />
          <Field autoFocus defaultValue="" label="First name" name="firstName" maxLength={100} required />
          <Field defaultValue="" label="Last name" name="lastName" maxLength={100} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field defaultValue="" label="Email" maxLength={254} name="email" type="email" />
          <Field defaultValue="" label="Phone" maxLength={50} name="phone" />
          <SelectField defaultValue="ADULT" label="Age group" name="ageGroup">
            <option value="ADULT">Adult</option>
            <option value="CHILD">Child</option>
            <option value="INFANT">Infant</option>
          </SelectField>
          {lockedHouseholdId ? (
            <div className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">
              Household
              <div className="flex h-10 items-center rounded-[10px] border border-[#E8E8E3] bg-[#FAFAF8] px-3 text-[13px] text-[#1C1C1C]">
                {households.find((household) => household.id === lockedHouseholdId)?.name ?? "Selected household"}
              </div>
            </div>
          ) : (
            <SelectField defaultValue="" label="Household" name="householdId">
              <option value="">No household</option>
              {households.map((household) => <option key={household.id} value={household.id}>{household.name}</option>)}
            </SelectField>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextArea defaultValue="" label="Dietary requirements" maxLength={2000} name="dietaryRequirements" />
          <TextArea defaultValue="" label="Notes" maxLength={2000} name="notes" />
        </div>
        <TagFields tags={tags} />
        <GuestSectionSelector
          onChange={setSelectedSections}
          sections={sections}
          selectedSectionIds={selectedSections}
        />

        <div className="rounded-xl border border-dashed border-[#C9DCC5] bg-[#F7FBF5] p-4">
          <button
            className="text-sm font-semibold text-[#2D5A27] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A27]"
            onClick={togglePlusOne}
            type="button"
          >
            {plusOneOpen ? "− Remove plus-one" : "+ Add a plus-one"}
          </button>
          {plusOneOpen ? (
            <div className="mt-4 space-y-4 border-t border-[#DDEBD9] pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <ControlledField label="First name" maxLength={100} required value={plusOneDraft.firstName} onChange={(value) => setPlusOneDraft((draft) => ({ ...draft, firstName: value }))} />
                <ControlledField label="Last name" maxLength={100} required value={plusOneDraft.lastName} onChange={(value) => setPlusOneDraft((draft) => ({ ...draft, lastName: value }))} />
                <ControlledField label="Email" maxLength={254} type="email" value={plusOneDraft.email} onChange={(value) => setPlusOneDraft((draft) => ({ ...draft, email: value }))} />
                <ControlledField label="Phone" maxLength={50} value={plusOneDraft.phone} onChange={(value) => setPlusOneDraft((draft) => ({ ...draft, phone: value }))} />
                <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">
                  Age group
                  <Select value={plusOneDraft.ageGroup} onChange={(event) => setPlusOneDraft((draft) => ({ ...draft, ageGroup: event.target.value }))}>
                    <option value="ADULT">Adult</option>
                    <option value="CHILD">Child</option>
                    <option value="INFANT">Infant</option>
                  </Select>
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <ControlledTextArea label="Dietary requirements" maxLength={2000} value={plusOneDraft.dietaryRequirements} onChange={(value) => setPlusOneDraft((draft) => ({ ...draft, dietaryRequirements: value }))} />
                <ControlledTextArea label="Notes" maxLength={2000} value={plusOneDraft.notes} onChange={(value) => setPlusOneDraft((draft) => ({ ...draft, notes: value }))} />
              </div>
              <GuestSectionSelector
                onChange={setSelectedPlusOneSections}
                sections={sections}
                selectedSectionIds={selectedPlusOneSections}
              />
            </div>
          ) : null}
        </div>

        {error ? <p aria-live="polite" className="text-sm text-[#9D3F32]">{error}</p> : null}
        <div className="flex justify-end gap-2 border-t border-[#F0EFEA] pt-4">
          <Button disabled={isPending} onClick={close} type="button" variant="ghost">Cancel</Button>
          <Button disabled={isPending} type="submit" variant="primary">{isPending ? "Adding…" : "Add guest"}</Button>
        </div>
        </form>
      </Modal>
      <ConfirmDialog
        confirmLabel={confirmation === "close" ? "Discard and close" : "Clear and collapse"}
        description={confirmation === "close"
          ? "The entered plus-one details will be discarded."
          : "The entered plus-one details will be cleared."}
        onClose={() => setConfirmation(null)}
        onConfirm={confirmDiscard}
        open={Boolean(confirmation)}
        title={confirmation === "close" ? "Discard plus-one details?" : "Clear plus-one details?"}
      />
    </>
  );
}

function hasPlusOneDraft(draft: PlusOneDraft, selectedSectionIds: string[]) {
  return [
    draft.firstName,
    draft.lastName,
    draft.email,
    draft.phone,
    draft.dietaryRequirements,
    draft.notes,
  ].some((value) => value.trim().length > 0) || selectedSectionIds.length > 0;
}

function Field({ label, name, defaultValue, type = "text", required = false, autoFocus = false, maxLength }: { label: string; name: string; defaultValue: string; type?: string; required?: boolean; autoFocus?: boolean; maxLength?: number }) {
  return <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">{label}<Input autoFocus={autoFocus} data-modal-autofocus={autoFocus ? "true" : undefined} defaultValue={defaultValue} maxLength={maxLength} name={name} required={required} type={type} /></label>;
}

function SelectField({ label, name, defaultValue, children }: { label: string; name: string; defaultValue: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">{label}<Select defaultValue={defaultValue} name={name}>{children}</Select></label>;
}

function TextArea({ label, name, defaultValue, maxLength }: { label: string; name: string; defaultValue: string; maxLength?: number }) {
  return <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">{label}<textarea className="min-h-20 rounded-[10px] border border-[#E8E8E3] bg-white px-3 py-2 text-sm outline-none focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]" defaultValue={defaultValue} maxLength={maxLength} name={name} /></label>;
}

function ControlledField({ label, value, onChange, type = "text", required = false, maxLength }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; maxLength?: number }) {
  return <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">{label}<Input maxLength={maxLength} onChange={(event) => onChange(event.target.value)} required={required} type={type} value={value} /></label>;
}

function ControlledTextArea({ label, value, onChange, maxLength }: { label: string; value: string; onChange: (value: string) => void; maxLength?: number }) {
  return <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">{label}<textarea className="min-h-20 rounded-[10px] border border-[#E8E8E3] bg-white px-3 py-2 text-sm outline-none focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]" maxLength={maxLength} onChange={(event) => onChange(event.target.value)} value={value} /></label>;
}

function TagFields({ tags }: { tags: GuestListTag[] }) {
  return (
    <fieldset>
      <legend className="text-xs font-medium text-[#6B6B63]">Tags</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {tags.length > 0 ? tags.map((tag) => (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#E8E8E3] px-3 py-1.5 text-xs text-[#6B6B63] has-[:checked]:border-[#2D5A27] has-[:checked]:bg-[#EAF0E8] has-[:checked]:text-[#2D5A27]" key={tag.id}>
            <input className="sr-only" name="tagIds" type="checkbox" value={tag.id} />{tag.name}
          </label>
        )) : <span className="text-xs text-[#8A8A82]">No tags created yet.</span>}
      </div>
    </fieldset>
  );
}
