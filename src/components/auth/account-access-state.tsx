"use client";

import { SignOutControl } from "./sign-out-button";

export type AccountAccessError = { title: string; message: string };

export function AccountAccessState({ error }: { error: AccountAccessError }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAF8] px-5 py-12">
      <section className="w-full max-w-xl rounded-[20px] border border-[#E4E0D4] bg-white p-7 sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9D3F32]">Account access</p>
        <h1 className="mt-2 font-serif text-3xl text-[#1C1C1C]">{error.title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#7A7A6E]">{error.message}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button className="rounded-[10px] bg-[#2D5A27] px-4 py-2 text-sm font-semibold text-white" onClick={() => window.location.reload()} type="button">Try again</button>
          <SignOutControl redirectUrl="/sign-in" />
        </div>
      </section>
    </main>
  );
}
