"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  createHousehold,
  deleteHousehold,
  updateHousehold,
  type HouseholdActionResult,
  type HouseholdData,
} from "@/src/server/actions/guests/household.actions";
import { Button } from "@/src/components/shared/ui";
import { ConfirmDialog } from "@/src/components/shared/confirm-dialog";
import {
  invalidateGuestsAndDashboardQueries,
  invalidateGuestsQuery,
} from "./guest-query-cache";

export function HouseholdForm({
  household,
  weddingId,
}: {
  household?: HouseholdData;
  weddingId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const input = {
      name: formData.get("name"),
      addressLineOne: formData.get("addressLineOne"),
      addressLineTwo: formData.get("addressLineTwo"),
      townCity: formData.get("townCity"),
      countyRegion: formData.get("countyRegion"),
      postcode: formData.get("postcode"),
      country: formData.get("country"),
      notes: formData.get("notes"),
    };

    startTransition(async () => {
      try {
        const result: HouseholdActionResult<HouseholdData> = household
          ? await updateHousehold(household.id, input)
          : await createHousehold(input);

        if (!result.success) {
          setError(result.error);
          return;
        }

        if (household) {
          void invalidateGuestsQuery(queryClient, weddingId);
        } else {
          void invalidateGuestsAndDashboardQueries(queryClient, weddingId);
        }
        setMessage(household ? "Household details saved." : "Household created.");
        if (!household) form.reset();
      } catch {
        setError("Unable to save household. Please try again.");
      }
    });
  }

  function remove() {
    if (!household) return;

    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteHousehold(household.id);
        if (!result.success) {
          setIsDeleteOpen(false);
          setError(result.error);
          return;
        }

        setIsDeleteOpen(false);
        void invalidateGuestsAndDashboardQueries(queryClient, weddingId);
        router.push("/guests/households");
      } catch {
        setIsDeleteOpen(false);
        setError("Unable to delete household. Please try again.");
      }
    });
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Household name" name="name" maxLength={150} required defaultValue={household?.name ?? ""} />
        <Field label="Country" name="country" maxLength={100} required defaultValue={household?.country ?? "United Kingdom"} />
        <Field label="Address line one" name="addressLineOne" maxLength={200} required defaultValue={household?.addressLineOne ?? ""} />
        <Field label="Address line two" name="addressLineTwo" maxLength={200} defaultValue={household?.addressLineTwo ?? ""} />
        <Field label="Town or city" name="townCity" maxLength={100} required defaultValue={household?.townCity ?? ""} />
        <Field label="County or region" name="countyRegion" maxLength={100} defaultValue={household?.countyRegion ?? ""} />
        <Field label="Postcode" name="postcode" maxLength={30} required defaultValue={household?.postcode ?? ""} />
      </div>
      <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">
        Notes
        <textarea
          className="min-h-24 rounded-[10px] border border-[#E8E8E3] bg-white px-3 py-2 text-sm text-[#1C1C1C] outline-none focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
          defaultValue={household?.notes ?? ""}
          maxLength={2000}
          name="notes"
        />
      </label>
      {error ? <p aria-live="polite" className="text-sm text-[#9D3F32]">{error}</p> : null}
      {message ? <p aria-live="polite" className="text-sm text-[#2D5A27]">{message}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {household ? (
          <Button
            className="text-[#9D3F32] hover:bg-[#FFF5F3]"
            disabled={isPending}
            onClick={() => setIsDeleteOpen(true)}
            type="button"
            variant="ghost"
          >
            Delete household
          </Button>
        ) : <span />}
        <Button disabled={isPending} type="submit" variant="primary">
          {isPending ? "Saving…" : household ? "Save household" : "Create household"}
        </Button>
      </div>
      {household ? (
        <ConfirmDialog
          confirmLabel="Delete household"
          description="The household will be deleted, but its guests will remain in the wedding without a household."
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={remove}
          open={isDeleteOpen}
          pending={isPending}
          title={`Delete ${household.name}?`}
        />
      ) : null}
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required = false,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">
      {label}
      <input
        className="h-10 rounded-[10px] border border-[#E8E8E3] bg-white px-3 text-sm text-[#1C1C1C] outline-none focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
        defaultValue={defaultValue}
        maxLength={maxLength}
        name={name}
        required={required}
      />
    </label>
  );
}
