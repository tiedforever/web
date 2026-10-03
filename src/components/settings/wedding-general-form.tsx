"use client";

import { FormEvent, useState, useTransition } from "react";

import {
  updateWeddingGeneralSettings,
  type WeddingGeneralSettingsData,
  type WeddingSettingsActionResult,
} from "@/src/server/actions/settings/wedding-settings.actions";
import { Button, Card, Input, Select } from "@/src/components/shared/ui";

const COMMON_TIMEZONES = [
  "Europe/London",
  "Europe/Dublin",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
];

export function WeddingGeneralForm({
  initialData,
  readOnly = false,
}: {
  initialData: WeddingGeneralSettingsData;
  readOnly?: boolean;
}) {
  const [form, setForm] = useState(initialData);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const timezones = Array.from(new Set([form.timezone, ...COMMON_TIMEZONES]));

  function updateField<K extends keyof WeddingGeneralSettingsData>(
    field: K,
    value: WeddingGeneralSettingsData[K],
  ) {
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
        const result: WeddingSettingsActionResult<WeddingGeneralSettingsData> =
          await updateWeddingGeneralSettings(form);

        if (!result.success) {
          setError(result.error);
          return;
        }

        setForm(result.data);
        setMessage("General wedding settings saved.");
      } catch {
        setError("Unable to save general wedding settings. Please try again.");
      }
    });
  }

  return (
    <Card className="p-5 sm:p-6">
      <form className="space-y-7" onSubmit={submit}>
        <div>
          <h2 className="text-base font-semibold text-[#1C1C1C]">Wedding details</h2>
          <p className="mt-1 text-sm leading-6 text-[#7A7A6E]">
            Keep the core details for this wedding workspace up to date.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Wedding name" required>
            <Input
              disabled={readOnly}
              maxLength={120}
              onChange={(event) => updateField("name", event.target.value)}
              required
              value={form.name}
            />
          </Field>
          <Field label="Wedding date" required>
            <Input
              disabled={readOnly}
              onChange={(event) => updateField("weddingDate", event.target.value)}
              required
              type="date"
              value={form.weddingDate}
            />
          </Field>
          <Field label="Partner one" required>
            <Input
              disabled={readOnly}
              maxLength={100}
              onChange={(event) => updateField("partnerOneName", event.target.value)}
              required
              value={form.partnerOneName}
            />
          </Field>
          <Field label="Partner two" required>
            <Input
              disabled={readOnly}
              maxLength={100}
              onChange={(event) => updateField("partnerTwoName", event.target.value)}
              required
              value={form.partnerTwoName}
            />
          </Field>
        </div>

        <div className="border-t border-[#F0EFEA] pt-6">
          <h2 className="text-base font-semibold text-[#1C1C1C]">Regional settings</h2>
          <p className="mt-1 text-sm leading-6 text-[#7A7A6E]">
            These settings control how dates, times, and money are displayed.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Timezone" required>
              <Select
                disabled={readOnly}
                onChange={(event) => updateField("timezone", event.target.value)}
                required
                value={form.timezone}
              >
                {timezones.map((timezone) => (
                  <option key={timezone} value={timezone}>{timezone}</option>
                ))}
              </Select>
            </Field>
            <Field label="Currency code" required hint="Three-letter code, such as GBP or USD.">
              <Input
                disabled={readOnly}
                maxLength={3}
                onChange={(event) => updateField("currencyCode", event.target.value.toUpperCase())}
                required
                value={form.currencyCode}
              />
            </Field>
          </div>
        </div>

        <div className="border-t border-[#F0EFEA] pt-6">
          <h2 className="text-base font-semibold text-[#1C1C1C]">Planning options</h2>
          <p className="mt-1 text-sm leading-6 text-[#7A7A6E]">
            Choose which wedding planning details are relevant to your workspace.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Toggle
              checked={form.mealChoicesEnabled}
              disabled={readOnly}
              label="Meal choices"
              onChange={(value) => updateField("mealChoicesEnabled", value)}
            />
            <Toggle
              checked={form.dietaryRequirementsEnabled}
              disabled={readOnly}
              label="Dietary requirements"
              onChange={(value) => updateField("dietaryRequirementsEnabled", value)}
            />
          </div>
        </div>

        {error ? <p aria-live="polite" className="rounded-lg bg-[#FFF5F3] px-3 py-2 text-sm text-[#9D3F32]">{error}</p> : null}
        {message ? <p aria-live="polite" className="rounded-lg bg-[#EAF0E8] px-3 py-2 text-sm text-[#2D5A27]">{message}</p> : null}

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
  required = false,
}: {
  children: React.ReactNode;
  hint?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">
      <span>{label}{required ? <span className="text-[#9D3F32]"> *</span> : null}</span>
      {children}
      {hint ? <span className="text-[11px] font-normal text-[#8A8A82]">{hint}</span> : null}
    </label>
  );
}

function Toggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={`flex items-center gap-3 rounded-xl border border-[#E8E8E3] px-4 py-3 text-sm ${disabled ? "bg-[#F4F4F1] text-[#8A8A82]" : "bg-white text-[#3F413A]"}`}>
      <input
        checked={checked}
        className="h-4 w-4 accent-[#2D5A27]"
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  );
}
