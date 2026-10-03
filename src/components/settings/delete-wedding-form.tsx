"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteActiveWedding } from "@/src/server/actions/wedding/wedding.actions";

type DeleteWeddingFormProps = {
  weddingName: string;
};

export function DeleteWeddingForm({ weddingName }: DeleteWeddingFormProps) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canDelete = confirmation.trim() === weddingName;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const result = await deleteActiveWedding(confirmation);

        if (!result.success) {
          setError(result.error);
          return;
        }

        // A user may intentionally keep an account without a wedding. Return
        // to the normal shell so the optional-onboarding flow is preserved.
        router.push("/dashboard");
      } catch {
        setError("Unable to delete the wedding. Please try again.");
      }
    });
  }

  return (
    <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
      <p className="text-sm leading-6 text-[#7A4A43]">
        This permanently removes the wedding, its members, and all checklist data.
        This cannot be undone.
      </p>
      <label className="block max-w-xl">
        <span className="mb-1.5 block text-sm font-medium text-[#5C211B]">
          Type <strong>{weddingName}</strong> to confirm
        </span>
        <input
          className="h-10 w-full rounded-[10px] border border-[#E7C9C5] bg-white px-3 text-sm text-[#1C1C1C] outline-none placeholder:text-[#B88D86] focus:border-[#9D3F32] focus:ring-2 focus:ring-[#FDE5E0]"
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder={weddingName}
          value={confirmation}
        />
      </label>
      {error ? (
        <p aria-live="polite" className="text-sm text-[#9D3F32]">
          {error}
        </p>
      ) : null}
      <button
        className="rounded-[10px] bg-[#9D3F32] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#84352B] disabled:cursor-not-allowed disabled:opacity-45"
        disabled={!canDelete || isPending}
        type="submit"
      >
        {isPending ? "Deleting wedding…" : "Delete wedding permanently"}
      </button>
    </form>
  );
}
