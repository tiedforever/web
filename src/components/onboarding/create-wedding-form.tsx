"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { skipOnboarding } from "@/src/server/actions/onboarding/onboarding.actions";
import { createWedding } from "@/src/server/actions/wedding/wedding.actions";

export function CreateWeddingForm({ allowSkip = true }: { allowSkip?: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [developmentWorkspaceInvitationUrl, setDevelopmentWorkspaceInvitationUrl] = useState<string | null>(null);
  const [invitePartner, setInvitePartner] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || success) return;
    setError(null);
    setSuccess(null);
    setDevelopmentWorkspaceInvitationUrl(null);

    const formData = new FormData(event.currentTarget);
    const input = {
      name: formData.get("name"),
      partnerOneName: formData.get("partnerOneName"),
      partnerTwoName: formData.get("partnerTwoName"),
      weddingDate: formData.get("weddingDate"),
      timezone: formData.get("timezone"),
      currencyCode: formData.get("currencyCode"),
      ceremonyLocation: formData.get("ceremonyLocation"),
      receptionLocation: formData.get("receptionLocation"),
      invitePartner,
      partnerEmail: formData.get("partnerEmail"),
    };

    startTransition(async () => {
      try {
        const result = await createWedding(input);

        if (!result.success) {
          setError(result.error);
          return;
        }

        formRef.current?.reset();

        if (result.data.memberInvitationMessage) {
          setSuccess(result.data.memberInvitationMessage);
          setDevelopmentWorkspaceInvitationUrl(result.data.developmentWorkspaceInvitationUrl ?? null);
          setInvitePartner(false);
          return;
        }

        router.push("/dashboard");
      } catch {
        setError("Unable to create wedding. Please try again.");
      }
    });
  }

  function handleSkip() {
    setError(null);
    setSuccess(null);
    setDevelopmentWorkspaceInvitationUrl(null);

    startTransition(async () => {
      try {
        const result = await skipOnboarding();

        if (!result.success) {
          setError(result.error);
          return;
        }

        router.push("/dashboard");
      } catch {
        setError("Unable to skip onboarding. Please try again.");
      }
    });
  }

  return (
    <form
      className="mt-8 grid gap-5"
      ref={formRef}
      onSubmit={handleSubmit}
    >
      <label>
        <span className="mb-1.5 block text-sm font-medium text-[#3F413A]">
          Wedding name
        </span>
        <input
          className="w-full rounded-[10px] border border-[#E4E0D4] bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
          maxLength={120}
          name="name"
          placeholder="Ethan & Emily's Wedding"
          required
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label>
          <span className="mb-1.5 block text-sm font-medium text-[#3F413A]">
            Partner one
          </span>
          <input
            className="w-full rounded-[10px] border border-[#E4E0D4] bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
            maxLength={100}
            name="partnerOneName"
            required
          />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-[#3F413A]">
            Partner two
          </span>
          <input
            className="w-full rounded-[10px] border border-[#E4E0D4] bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
            maxLength={100}
            name="partnerTwoName"
            required
          />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <label>
          <span className="mb-1.5 block text-sm font-medium text-[#3F413A]">
            Wedding date
          </span>
          <input
            className="w-full rounded-[10px] border border-[#E4E0D4] bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
            name="weddingDate"
            required
            type="date"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-[#3F413A]">
            Timezone
          </span>
          <input
            className="w-full rounded-[10px] border border-[#E4E0D4] bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
            defaultValue="Europe/London"
            maxLength={100}
            name="timezone"
            required
          />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-[#3F413A]">
            Currency
          </span>
          <input
            className="w-full rounded-[10px] border border-[#E4E0D4] bg-white px-3.5 py-3 text-sm uppercase outline-none transition focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
            defaultValue="GBP"
            maxLength={3}
            name="currencyCode"
            required
          />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label>
          <span className="mb-1.5 block text-sm font-medium text-[#3F413A]">
            Ceremony location <span className="font-normal text-[#7A7D73]">(optional)</span>
          </span>
          <input
            className="w-full rounded-[10px] border border-[#E4E0D4] bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
            maxLength={200}
            name="ceremonyLocation"
            placeholder="Church, venue, or address"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-[#3F413A]">
            Reception location <span className="font-normal text-[#7A7D73]">(optional)</span>
          </span>
          <input
            className="w-full rounded-[10px] border border-[#E4E0D4] bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
            maxLength={200}
            name="receptionLocation"
            placeholder="Hotel, restaurant, or address"
          />
        </label>
      </div>

      <fieldset className="rounded-[12px] border border-[#E4E0D4] bg-[#FBFDF9] p-4">
        <legend className="px-1 text-sm font-medium text-[#3F413A]">
          Invite your fiancé(e)
        </legend>
        <label className="mt-2 flex items-start gap-3 text-sm text-[#5D6057]">
          <input
            checked={invitePartner}
            className="mt-0.5 h-4 w-4 accent-[#2D5A27]"
            onChange={(event) => setInvitePartner(event.target.checked)}
            type="checkbox"
          />
          <span>
            Yes, send them a workspace member invitation to join this private wedding workspace as an OWNER.
          </span>
        </label>
        {invitePartner ? (
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium text-[#3F413A]">
              Fiancé(e) email
            </span>
            <input
              className="w-full rounded-[10px] border border-[#E4E0D4] bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
              maxLength={254}
              name="partnerEmail"
              placeholder="partner@example.com"
              required
              type="email"
            />
          </label>
        ) : null}
      </fieldset>

      {error ? (
        <p aria-live="polite" className="rounded-lg bg-[#FFF5F3] px-3 py-2 text-sm text-[#9D3F32]">
          {error}
        </p>
      ) : null}

      {success ? (
        <div className="rounded-lg bg-[#EAF0E8] px-3 py-3 text-sm text-[#2D5A27]">
          <p aria-live="polite">{success}</p>
          {developmentWorkspaceInvitationUrl ? (
            <a
              className="mt-2 inline-block break-all font-medium underline"
              href={developmentWorkspaceInvitationUrl}
            >
              Open development workspace invitation link
            </a>
          ) : null}
          <button
            className="mt-3 block rounded-[10px] bg-[#2D5A27] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#245020]"
            onClick={() => router.push("/dashboard")}
            type="button"
          >
            Continue to dashboard
          </button>
        </div>
      ) : null}

      {!success ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className="w-full rounded-[10px] bg-[#2D5A27] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#245020] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Creating wedding…" : "Create wedding"}
        </button>
        {allowSkip ? <button
          className="w-full rounded-[10px] border border-[#E4E0D4] bg-white px-5 py-3 text-sm font-medium text-[#6B6B63] transition hover:bg-[#F7F6F2] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          disabled={isPending}
          onClick={handleSkip}
          type="button"
        >
          {isPending ? "Saving…" : "Skip for now"}
        </button> : null}
      </div> : null}
    </form>
  );
}
