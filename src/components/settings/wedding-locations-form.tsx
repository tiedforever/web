"use client";

import { FormEvent, useState, useTransition } from "react";

import {
  updateWeddingLocations,
  type WeddingLocationsData,
  type WeddingSettingsActionResult,
} from "@/src/server/actions/settings/wedding-settings.actions";
import { Button, Card, Input } from "@/src/components/shared/ui";

const MAX_LOCATION_LENGTH = 200;

export function WeddingLocationsForm({
  initialData,
  readOnly = false,
}: {
  initialData: WeddingLocationsData;
  readOnly?: boolean;
}) {
  const [form, setForm] = useState(initialData);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField(field: keyof WeddingLocationsData, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage(null);
    setError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) return;

    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        const result: WeddingSettingsActionResult<WeddingLocationsData> =
          await updateWeddingLocations(form);

        if (!result.success) {
          setError(result.error);
          return;
        }

        setForm(result.data);
        setMessage("Wedding locations saved.");
      } catch {
        setError("Unable to save wedding locations. Please try again.");
      }
    });
  }

  return (
    <Card className="p-5 sm:p-6">
      <form className="space-y-7" onSubmit={submit}>
        <div>
          <h2 className="text-base font-semibold text-[#1C1C1C]">Ceremony and reception</h2>
          <p className="mt-1 text-sm leading-6 text-[#7A7A6E]">
            Add the main locations for your wedding. You can update these as plans change.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Ceremony location" hint="Venue name or a short location description.">
            <Input
              disabled={readOnly}
              maxLength={MAX_LOCATION_LENGTH}
              onChange={(event) => updateField("ceremonyLocation", event.target.value)}
              placeholder="For example, Ballyclare Presbyterian Church"
              value={form.ceremonyLocation ?? ""}
            />
          </Field>
          <Field label="Reception location" hint="Venue name or a short location description.">
            <Input
              disabled={readOnly}
              maxLength={MAX_LOCATION_LENGTH}
              onChange={(event) => updateField("receptionLocation", event.target.value)}
              placeholder="For example, Tullyglass Hotel"
              value={form.receptionLocation ?? ""}
            />
          </Field>
        </div>

        {error ? (
          <p aria-live="polite" className="rounded-lg bg-[#FFF5F3] px-3 py-2 text-sm text-[#9D3F32]">
            {error}
          </p>
        ) : null}
        {message ? (
          <p aria-live="polite" className="rounded-lg bg-[#EAF0E8] px-3 py-2 text-sm text-[#2D5A27]">
            {message}
          </p>
        ) : null}

        {!readOnly ? (
          <div className="flex justify-end border-t border-[#F0EFEA] pt-5">
            <Button disabled={isPending} type="submit" variant="primary">
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        ) : null}
      </form>
    </Card>
  );
}

function Field({
  children,
  hint,
  label,
}: {
  children: React.ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">
      <span>{label}</span>
      {children}
      {hint ? <span className="text-[11px] font-normal text-[#8A8A82]">{hint}</span> : null}
    </label>
  );
}
