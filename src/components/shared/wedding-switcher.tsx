"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { setActiveWedding } from "@/src/server/actions/wedding/wedding.actions";
import { Icon } from "./icons";

export type WeddingSwitcherOption = {
  id: string;
  name: string;
  partnerNames: string;
};

type WeddingSwitcherProps = {
  activeWeddingId: string | null;
  compact?: boolean;
  options: WeddingSwitcherOption[];
};

const CREATE_WEDDING_OPTION = "create-wedding";

export function WeddingSwitcher({ activeWeddingId, compact = false, options }: WeddingSwitcherProps) {
  const router = useRouter();
  const selectId = useId();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (options.length === 0) {
    return compact ? (
      <Link className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-[#2D5A27] hover:bg-[#F3F1EA]" href="/onboarding">Create wedding</Link>
    ) : (
      <div className="mx-4 mt-4 rounded-[12px] border border-[#E4E0D4] bg-white p-3.5">
        <p className="text-xs font-semibold text-[#1C1C1C]">No wedding yet</p>
        <Link className="mt-2 inline-flex text-[11px] font-semibold text-[#2D5A27] hover:underline" href="/onboarding">Create your wedding</Link>
      </div>
    );
  }

  function handleChange(weddingId: string) {
    setError(null);
    if (weddingId === CREATE_WEDDING_OPTION) {
      router.push("/weddings/new");
      return;
    }
    startTransition(async () => {
      try {
        const result = await setActiveWedding(weddingId);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.refresh();
      } catch {
        setError("Unable to switch weddings right now. Please try again.");
      }
    });
  }

  const activeOption = options.find((option) => option.id === activeWeddingId) ?? options[0];

  return (
    <div className={compact ? "relative min-w-0 max-w-[160px] shrink-0 sm:max-w-[220px]" : "mx-4 mt-4 rounded-[12px] border border-[#E4E0D4] bg-gradient-to-br from-[#EAF0E8] to-[#FBF5E6] p-3.5"}>
      {!compact ? <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7A7A6E]">Current wedding</span> : null}
      <label className={`relative block ${compact ? "" : "mt-1.5"}`} htmlFor={selectId}>
        <span className="sr-only">Switch active wedding or create another wedding</span>
        <select
          aria-label="Switch active wedding or create another wedding"
          className={compact
            ? "h-10 w-full appearance-none truncate rounded-[10px] border border-[#E4E0D4] bg-[#F7F6F2] px-3.5 pr-9 text-sm font-semibold text-[#1C1C1C] outline-none focus:border-[#2D5A27] focus:ring-2 focus:ring-[#DDEBD9] disabled:cursor-wait disabled:opacity-60"
            : "w-full appearance-none truncate rounded-lg border border-transparent bg-white/70 px-2.5 py-2 pr-8 text-xs font-semibold text-[#1C1C1C] outline-none focus:border-[#2D5A27] focus:ring-2 focus:ring-[#DDEBD9] disabled:cursor-wait disabled:opacity-60"}
          disabled={isPending}
          id={selectId}
          onChange={(event) => handleChange(event.target.value)}
          value={activeOption.id}
        >
          {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          <option value={CREATE_WEDDING_OPTION}>Create another wedding</option>
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B6B63]"><Icon name="chevron-down" size={14} /></span>
      </label>
      {!compact ? <p className="mt-1.5 truncate text-[11px] text-[#7A7A6E]">{activeOption.partnerNames}</p> : null}
      {error ? (
        <p aria-live="polite" className={compact ? "absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-[#E7C9C5] bg-[#FFF5F3] px-2.5 py-2 text-[10px] text-[#9D3F32] shadow-sm" : "mt-2 text-[10px] text-[#9D3F32]"}>{error}</p>
      ) : null}
    </div>
  );
}
