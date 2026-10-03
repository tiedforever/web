"use client";

import { useClerk } from "@clerk/nextjs";
import { useState, useTransition } from "react";

import { deleteMyAccount } from "@/src/server/actions/account/account.actions";
import { navigateAfterAccountDeletion } from "./account-deletion-navigation";

export function DeleteAccountForm() {
  const { signOut } = useClerk();
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canDelete = confirmation.trim() === "DELETE";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const result = await deleteMyAccount(confirmation);

        if (!result.success) {
          setError(result.error);
          return;
        }

        await navigateAfterAccountDeletion(signOut, (path) => {
          window.location.assign(path);
        });
      } catch {
        setError("Unable to delete the account. Please try again.");
      }
    });
  }

  return (
    <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
      <p className="text-sm leading-6 text-[#7A4A43]">
        This permanently deletes your Tied Forever account, removes your access
        to every wedding, and cannot be undone. Weddings will remain for their
        other members. If you are the only active owner of any wedding, add
        another owner or delete that wedding before deleting your account.
      </p>
      <label className="block max-w-xl">
        <span className="mb-1.5 block text-sm font-medium text-[#5C211B]">
          Type <strong>DELETE</strong> to confirm
        </span>
        <input
          className="h-10 w-full rounded-[10px] border border-[#E7C9C5] bg-white px-3 text-sm text-[#1C1C1C] outline-none placeholder:text-[#B88D86] focus:border-[#9D3F32] focus:ring-2 focus:ring-[#FDE5E0]"
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder="DELETE"
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
        {isPending ? "Deleting account…" : "Delete account permanently"}
      </button>
    </form>
  );
}
