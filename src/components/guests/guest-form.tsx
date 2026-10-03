"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  addPlusOne,
  attachExistingGuestAsPlusOne,
  createGuest,
  deleteGuest,
  updateGuest,
  type GuestActionData,
  type GuestActionResult,
  type GuestTagActionData,
} from "@/src/server/actions/guests/guest.actions";
import type { HouseholdData } from "@/src/server/actions/guests/household.actions";
import type { GuestListSection } from "@/src/server/repositories/guest-list.repository";
import { Button, Select } from "@/src/components/shared/ui";
import { ConfirmDialog } from "@/src/components/shared/confirm-dialog";
import { GuestSectionSelector } from "./guest-section-selector";
import {
  invalidateGuestsAndDashboardQueries,
  invalidateGuestsQuery,
} from "./guest-query-cache";

type GuestFormProps = {
  guest?: GuestActionData;
  households: Pick<HouseholdData, "id" | "name">[];
  sections: GuestListSection[];
  tags: GuestTagActionData[];
  existingGuests?: Pick<GuestActionData, "id" | "firstName" | "lastName">[];
  weddingId: string;
};

export function GuestForm({
  guest,
  households,
  sections,
  tags,
  existingGuests = [],
  weddingId,
}: GuestFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [plusOneOpen, setPlusOneOpen] = useState(false);
  const [plusOneDraft, setPlusOneDraft] = useState<PlusOneDraft>(emptyPlusOne);
  const [existingGuestId, setExistingGuestId] = useState("");
  const [confirmation, setConfirmation] = useState<"collapse" | "delete" | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>(
    guest?.tags.map((tag) => tag.id) ?? [],
  );
  const [selectedSections, setSelectedSections] = useState<string[]>(
    guest?.sections.map((section) => section.id) ?? [],
  );
  const [selectedPlusOneSections, setSelectedPlusOneSections] = useState<string[]>([]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const form = event.currentTarget;

    const formData = new FormData(form);
    const payload = {
      title: formData.get("title"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      ageGroup: formData.get("ageGroup"),
      householdId: formData.get("householdId"),
      dietaryRequirements: formData.get("dietaryRequirements"),
      notes: formData.get("notes"),
      tagIds: selectedTags,
      sectionIds: selectedSections,
    };

    startTransition(async () => {
      try {
        const result: GuestActionResult<GuestActionData> = guest
          ? await updateGuest(guest.id, payload)
          : await createGuest(payload);

        if (!result.success) {
          setError(result.error);
          return;
        }

        // Updating a guest can change household assignment, which changes the
        // Dashboard's unassigned guest count.
        void invalidateGuestsAndDashboardQueries(queryClient, weddingId);
        setMessage(guest ? "Guest details saved." : "Guest added to your list.");
        if (!guest) {
          form.reset();
          setSelectedTags([]);
          setSelectedSections([]);
        }
      } catch {
        setError("Unable to save guest. Please try again.");
      }
    });
  }

  function togglePlusOne() {
    if (plusOneOpen && (hasPlusOneDraft(plusOneDraft, selectedPlusOneSections) || existingGuestId)) {
      setConfirmation("collapse");
      return;
    }
    setPlusOneOpen((current) => !current);
  }

  function confirmCollapsePlusOne() {
    setPlusOneDraft(emptyPlusOne);
    setSelectedPlusOneSections([]);
    setExistingGuestId("");
    setPlusOneOpen(false);
    setConfirmation(null);
  }

  function attachExistingPlusOne() {
    if (!guest || !existingGuestId) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await attachExistingGuestAsPlusOne(guest.id, existingGuestId);
        if (!result.success) {
          setError(result.error);
          return;
        }
        setExistingGuestId("");
        setSelectedPlusOneSections([]);
        setPlusOneOpen(false);
        setMessage("Existing guest attached as a plus-one.");
        void invalidateGuestsQuery(queryClient, weddingId);
      } catch {
        setError("Unable to attach the existing guest. Please try again.");
      }
    });
  }

  function submitPlusOne() {
    if (!guest) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await addPlusOne(guest.id, {
          ...plusOneDraft,
          sectionIds: selectedPlusOneSections,
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
        setPlusOneDraft(emptyPlusOne);
        setSelectedPlusOneSections([]);
        setPlusOneOpen(false);
        setMessage("Plus-one added.");
        void invalidateGuestsAndDashboardQueries(queryClient, weddingId);
      } catch {
        setError("Unable to add plus-one. Please try again.");
      }
    });
  }

  function remove() {
    if (!guest) return;
    setConfirmation("delete");
  }

  function confirmDelete() {
    if (!guest) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteGuest(guest.id);
        if (!result.success) {
          setConfirmation(null);
          setError(result.error);
          return;
        }

        setConfirmation(null);
        void invalidateGuestsAndDashboardQueries(queryClient, weddingId);
        router.push("/guests");
      } catch {
        setConfirmation(null);
        setError("Unable to delete guest. Please try again.");
      }
    });
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-[110px_1fr_1fr]">
        <Field label="Title" name="title" defaultValue={guest?.title ?? ""} maxLength={30} />
        <Field
          label="First name"
          name="firstName"
          required
          defaultValue={guest?.firstName ?? ""}
          maxLength={100}
        />
        <Field
          label="Last name"
          name="lastName"
          required
          defaultValue={guest?.lastName ?? ""}
          maxLength={100}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" name="email" type="email" defaultValue={guest?.email ?? ""} maxLength={254} />
        <Field label="Phone" name="phone" defaultValue={guest?.phone ?? ""} maxLength={50} />
        <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">
          Age group
          <Select defaultValue={guest?.ageGroup ?? "ADULT"} name="ageGroup">
            <option value="ADULT">Adult</option>
            <option value="CHILD">Child</option>
            <option value="INFANT">Infant</option>
          </Select>
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">
          Household
          <Select defaultValue={guest?.householdId ?? ""} name="householdId">
            <option value="">No household</option>
            {households.map((household) => (
              <option key={household.id} value={household.id}>
                {household.name}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextArea
          label="Dietary requirements"
          name="dietaryRequirements"
          defaultValue={guest?.dietaryRequirements ?? ""}
          maxLength={2000}
        />
        <TextArea label="Notes" name="notes" defaultValue={guest?.notes ?? ""} maxLength={2000} />
      </div>

      <fieldset>
        <legend className="text-xs font-medium text-[#6B6B63]">Tags</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.length > 0 ? (
            tags.map((tag) => {
              const selected = selectedTags.includes(tag.id);
              return (
                <label
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${selected ? "border-[#2D5A27] bg-[#EAF0E8] text-[#2D5A27]" : "border-[#E8E8E3] text-[#6B6B63]"}`}
                  key={tag.id}
                >
                  <input
                    checked={selected}
                    className="sr-only"
                    onChange={() =>
                      setSelectedTags((current) =>
                        selected
                          ? current.filter((id) => id !== tag.id)
                          : [...current, tag.id],
                      )
                    }
                    type="checkbox"
                  />
                  {tag.name}
                </label>
              );
            })
          ) : (
            <p className="text-xs text-[#8A8A82]">Create a tag to organise guests.</p>
          )}
        </div>
      </fieldset>

      <GuestSectionSelector
        existingInactiveSections={guest?.sections.filter((section) => !section.active)}
        onChange={setSelectedSections}
        sections={sections}
        selectedSectionIds={selectedSections}
      />

      {guest?.plusOneFor ? (
        <div className="rounded-xl border border-[#DDEBD9] bg-[#F7FBF5] p-4 text-sm text-[#6B6B63]">
          This guest is already a plus-one and cannot have another plus-one attached.
        </div>
      ) : guest && guest.plusOnes.length > 0 ? (
        <div className="rounded-xl border border-[#DDEBD9] bg-[#F7FBF5] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4A7C57]">Plus-one attached</p>
          <div className="mt-3 space-y-2">
            {guest.plusOnes.map((plusOne) => (
              <Link
                className="block rounded-lg border border-[#C9DCC5] bg-white px-3 py-2 text-sm font-semibold text-[#2D5A27] hover:bg-[#EAF0E8]"
                href={`/guests/${plusOne.id}`}
                key={plusOne.id}
              >
                {plusOne.firstName} {plusOne.lastName}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-xs text-[#8A8A82]">Each guest can have only one plus-one.</p>
        </div>
      ) : guest ? (
        <div className="rounded-xl border border-dashed border-[#C9DCC5] bg-[#F7FBF5] p-4">
          <button
            className="text-sm font-semibold text-[#2D5A27] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A27]"
            onClick={togglePlusOne}
            type="button"
          >
            {plusOneOpen ? "− Remove plus-one form" : "+ Add a plus-one"}
          </button>
          {plusOneOpen ? (
            <div className="mt-4 space-y-4 border-t border-[#DDEBD9] pt-4">
              <p className="text-xs leading-5 text-[#8A8A82]">
                Attach someone already on the guest list, or create a new guest linked to {guest.firstName} {guest.lastName}.
              </p>
              {existingGuests.length > 0 ? (
                <div className="rounded-lg border border-[#DDEBD9] bg-white p-3">
                  <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">
                    Attach an existing guest
                    <Select
                      onChange={(event) => setExistingGuestId(event.target.value)}
                      value={existingGuestId}
                    >
                      <option value="">Choose a guest</option>
                      {existingGuests.map((existingGuest) => (
                        <option key={existingGuest.id} value={existingGuest.id}>
                          {existingGuest.firstName} {existingGuest.lastName}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <Button
                    className="mt-3"
                    disabled={isPending || !existingGuestId}
                    onClick={attachExistingPlusOne}
                    type="button"
                    variant="secondary"
                  >
                    {isPending ? "Attaching…" : "Attach existing guest"}
                  </Button>
                </div>
              ) : null}
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4A7C57]">Or create a new plus-one</p>
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
              <Button disabled={isPending} onClick={submitPlusOne} type="button" variant="secondary">
                {isPending ? "Adding…" : "Add plus-one"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p aria-live="polite" className="text-sm text-[#9D3F32]">{error}</p> : null}
      {message ? <p aria-live="polite" className="text-sm text-[#2D5A27]">{message}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {guest ? (
          <Button
            className="text-[#9D3F32] hover:bg-[#FFF5F3]"
            disabled={isPending}
            onClick={remove}
            type="button"
            variant="ghost"
          >
            Delete guest
          </Button>
        ) : <span />}
        <Button disabled={isPending} type="submit" variant="primary">
          {isPending ? "Saving…" : guest ? "Save guest" : "Add guest"}
        </Button>
      </div>
      {guest ? (
        <ConfirmDialog
          confirmLabel={confirmation === "collapse" ? "Clear and collapse" : "Delete guest"}
          description={confirmation === "collapse"
            ? "The entered plus-one details will be cleared."
            : guest.plusOnes.length > 0
              ? "This guest has a plus-one. Deleting this guest will keep the plus-one in the wedding but remove the relationship."
              : "This guest will be removed from the wedding. This cannot be undone."}
          onClose={() => setConfirmation(null)}
          onConfirm={confirmation === "collapse" ? confirmCollapsePlusOne : confirmDelete}
          open={Boolean(confirmation)}
          pending={isPending}
          title={confirmation === "collapse" ? "Clear plus-one details?" : "Delete guest?"}
        />
      ) : null}
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required = false,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">
      {label}
      <input
        className="h-10 rounded-[10px] border border-[#E8E8E3] bg-white px-3 text-sm text-[#1C1C1C] outline-none focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
        defaultValue={defaultValue}
        name={name}
        required={required}
        maxLength={maxLength}
        type={type}
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue: string;
  maxLength?: number;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">
      {label}
      <textarea
        className="min-h-24 rounded-[10px] border border-[#E8E8E3] bg-white px-3 py-2 text-sm text-[#1C1C1C] outline-none focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
        defaultValue={defaultValue}
        maxLength={maxLength}
        name={name}
      />
    </label>
  );
}

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

function ControlledField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">
      {label}
      <input
        className="h-10 rounded-[10px] border border-[#E8E8E3] bg-white px-3 text-sm text-[#1C1C1C] outline-none focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function ControlledTextArea({
  label,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">
      {label}
      <textarea
        className="min-h-20 rounded-[10px] border border-[#E8E8E3] bg-white px-3 py-2 text-sm outline-none focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}
