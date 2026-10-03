import { redirect } from "next/navigation";

import { CreateWeddingForm } from "@/src/components/onboarding/create-wedding-form";
import { getActiveWedding } from "@/src/server/auth/get-active-wedding";
import { NO_INDEX_ROBOTS } from "@/src/seo/site-metadata";

export const metadata = {
  title: "Create your wedding",
  robots: NO_INDEX_ROBOTS,
};

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const activeWedding = await getActiveWedding({ redirectToOnboarding: false });

  if (activeWedding) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAF8] px-5 py-12">
      <section className="w-full max-w-2xl rounded-[20px] border border-[#E4E0D4] bg-white p-7 shadow-[0_4px_16px_rgba(0,0,0,0.06)] sm:p-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#2D5A27] to-[#C4973A] text-white">
          <span aria-hidden="true" className="text-lg">✦</span>
        </div>
        <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2D5A27]">
          Welcome to Tied Forever
        </p>
        <h1 className="mt-2 font-serif text-3xl tracking-[-0.03em] text-[#1C1C1C] sm:text-4xl">
          Let&apos;s set up your wedding workspace.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#7A7A6E]">
          Add the essentials now. You can fill in the finer planning details as you go.
        </p>
        <CreateWeddingForm />
      </section>
    </main>
  );
}
