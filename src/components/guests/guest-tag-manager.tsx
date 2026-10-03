"use client";

import { FormEvent, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { createGuestTag } from "@/src/server/actions/guests/guest-tag.actions";
import type { GuestListTag } from "@/src/server/repositories/guest-list.repository";
import { Button } from "@/src/components/shared/ui";
import { invalidateGuestsQuery } from "./guest-query-cache";

export function GuestTagManager({
  tags,
  canEdit,
  weddingId,
}: {
  tags: GuestListTag[];
  canEdit: boolean;
  weddingId: string;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!canEdit) return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const result = await createGuestTag({
          name: formData.get("name"),
          colour: formData.get("colour"),
        });
        if (!result.success) {
          setError(result.error);
          return;
        }

        form.reset();
        setMessage("Tag created. It is now available when editing a guest.");
        void invalidateGuestsQuery(queryClient, weddingId);
      } catch {
        setError("Unable to create the guest tag. Please try again.");
      }
    });
  }

  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-xs font-semibold text-[#2D5A27] hover:underline">
        Manage guest tags ({tags.length})
      </summary>
      <div className="mt-4 rounded-xl border border-[#F0EFEA] bg-[#FAFAF8] p-4">
        <div className="flex flex-wrap gap-1.5">
          {tags.length > 0 ? tags.map((tag) => (
            <span className="rounded-full bg-[#EAF0E8] px-2.5 py-1 text-xs text-[#2D5A27]" key={tag.id}>{tag.name}</span>
          )) : <span className="text-xs text-[#8A8A82]">No wedding-specific tags yet.</span>}
        </div>
        <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={submit}>
          <input
            aria-label="New guest tag name"
            className="h-10 min-w-0 flex-1 rounded-[10px] border border-[#E8E8E3] bg-white px-3 text-sm outline-none focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
            maxLength={80}
            name="name"
            placeholder="New tag name"
            required
          />
          <input
            aria-label="Tag colour"
            className="h-10 w-12 rounded-[10px] border border-[#E8E8E3] bg-white p-1"
            defaultValue="#2D5A27"
            name="colour"
            type="color"
          />
          <Button disabled={isPending} type="submit" variant="secondary">
            {isPending ? "Adding…" : "Add tag"}
          </Button>
        </form>
        {error ? <p aria-live="polite" className="mt-2 text-xs text-[#9D3F32]">{error}</p> : null}
        {message ? <p aria-live="polite" className="mt-2 text-xs text-[#2D5A27]">{message}</p> : null}
      </div>
    </details>
  );
}
