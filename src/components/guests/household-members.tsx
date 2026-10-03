"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

import {
  addGuestsToHousehold,
  removeGuestsFromHousehold,
  setHouseholdPrimaryGuest,
  type HouseholdData,
  type HouseholdActionResult,
} from "@/src/server/actions/guests/household.actions";
import type { GuestActionData } from "@/src/server/actions/guests/guest.actions";
import { Badge, Button, Select } from "@/src/components/shared/ui";
import { ConfirmDialog } from "@/src/components/shared/confirm-dialog";
import {
  invalidateGuestsAndDashboardQueries,
  invalidateGuestsQuery,
} from "./guest-query-cache";

export function HouseholdMembers({
  household,
  guestsWithoutHousehold,
  canEdit = true,
  weddingId,
}: {
  household: HouseholdData;
  guestsWithoutHousehold: GuestActionData[];
  canEdit?: boolean;
  weddingId: string;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    action: "remove" | "primary";
    guestId: string;
    guestName: string;
  } | null>(null);

  function addGuests(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedGuestIds.length === 0) return;
    setError(null);
    startTransition(async () => {
      try {
        const result: HouseholdActionResult<HouseholdData> = await addGuestsToHousehold(
          household.id,
          selectedGuestIds,
        );
        if (!result.success) {
          setError(result.error);
          return;
        }
        setSelectedGuestIds([]);
        void invalidateGuestsAndDashboardQueries(queryClient, weddingId);
      } catch {
        setError("Unable to add guests to the household. Please try again.");
      }
    });
  }

  function removeGuest(guestId: string) {
    const guest = household.guests.find((member) => member.id === guestId);
    if (!guest) return;
    setConfirmation({
      action: "remove",
      guestId,
      guestName: `${guest.firstName} ${guest.lastName}`,
    });
  }

  function makePrimary(guestId: string) {
    const guest = household.guests.find((member) => member.id === guestId);
    if (!guest) return;
    setConfirmation({
      action: "primary",
      guestId,
      guestName: `${guest.firstName} ${guest.lastName}`,
    });
  }

  function confirmMemberChange() {
    if (!confirmation) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = confirmation.action === "remove"
          ? await removeGuestsFromHousehold(household.id, [confirmation.guestId])
          : await setHouseholdPrimaryGuest(household.id, confirmation.guestId);
        if (!result.success) {
          setConfirmation(null);
          setError(result.error);
          return;
        }
        setConfirmation(null);
        if (confirmation.action === "remove") {
          void invalidateGuestsAndDashboardQueries(queryClient, weddingId);
        } else {
          void invalidateGuestsQuery(queryClient, weddingId);
        }
      } catch {
        setConfirmation(null);
        setError("Unable to update the household member. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-[#1C1C1C]">Household members</h2>
        <p className="mt-1 text-xs text-[#8A8A82]">
          Guests remain in the wedding if this household is deleted.
        </p>
      </div>
      {household.guests.length > 0 ? (
        <ul className="divide-y divide-[#F0EFEA]">
          {household.guests.map((guest) => (
            <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0" key={guest.id}>
              <span>
                <Link className="block text-sm font-medium text-[#1C1C1C] hover:text-[#2D5A27]" href={`/guests/${guest.id}`}>{guest.firstName} {guest.lastName}</Link>
                <span className="mt-0.5 block text-xs text-[#8A8A82]">
                  {guest.plusOneFor ? `Plus-one of ${guest.plusOneFor.firstName} ${guest.plusOneFor.lastName}` : formatAgeGroup(guest.ageGroup)}
                  {guest.plusOneFor ? ` · ${formatAgeGroup(guest.ageGroup)}` : ""}
                  {guest.email ? ` · ${guest.email}` : ""}
                </span>
                {guest.tags.length > 0 ? (
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {guest.tags.map((tag) => <Badge key={tag.id} tone="success">{tag.name}</Badge>)}
                  </span>
                ) : null}
              </span>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {household.primaryGuestId === guest.id ? <Badge tone="success">Primary invitee</Badge> : null}
                {canEdit && !guest.plusOneFor && household.primaryGuestId !== guest.id ? (
                  <Button disabled={isPending} onClick={() => makePrimary(guest.id)} type="button" variant="ghost">
                    Make primary
                  </Button>
                ) : null}
                {canEdit ? (
                  <Button disabled={isPending} onClick={() => removeGuest(guest.id)} type="button" variant="ghost">
                    Remove
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-[#E4E0D4] px-4 py-6 text-sm text-[#8A8A82]">No guests are assigned to this household.</p>
      )}

      {canEdit && guestsWithoutHousehold.length > 0 ? (
        <form className="border-t border-[#F0EFEA] pt-5" onSubmit={addGuests}>
          <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">
            Add guests without a household
            <Select
              multiple
              onChange={(event) => setSelectedGuestIds(Array.from(event.target.selectedOptions, (option) => option.value))}
              size={Math.min(5, guestsWithoutHousehold.length)}
              value={selectedGuestIds}
            >
              {guestsWithoutHousehold.map((guest) => (
                <option key={guest.id} value={guest.id}>{guest.firstName} {guest.lastName}</option>
              ))}
            </Select>
          </label>
          <p className="mt-1.5 text-xs text-[#8A8A82]">Hold Ctrl or Command to select more than one guest.</p>
          <Button className="mt-3" disabled={isPending || selectedGuestIds.length === 0} type="submit" variant="secondary">
            Add selected guests
          </Button>
        </form>
      ) : null}
      {error ? <p aria-live="polite" className="text-sm text-[#9D3F32]">{error}</p> : null}
      <ConfirmDialog
        confirmLabel={confirmation?.action === "primary" ? "Make primary" : "Remove guest"}
        description={confirmation?.action === "primary"
          ? `${confirmation.guestName} will become the primary invitee for this household.`
          : `${confirmation?.guestName ?? "This guest"} will leave the household but remain in the wedding.`}
        onClose={() => setConfirmation(null)}
        onConfirm={confirmMemberChange}
        open={Boolean(confirmation)}
        pending={isPending}
        title={confirmation?.action === "primary" ? "Change primary invitee?" : "Remove household member?"}
      />
    </div>
  );
}

function formatAgeGroup(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
