import Link from "next/link";

import { CreateWeddingForm } from "@/src/components/onboarding/create-wedding-form";
import { getAuthenticatedUser } from "@/src/server/auth/get-authenticated-user";
import { NO_INDEX_ROBOTS } from "@/src/seo/site-metadata";

export const metadata = { title: "Create another wedding", robots: NO_INDEX_ROBOTS };
export const dynamic = "force-dynamic";

export default async function CreateAnotherWeddingPage() {
  await getAuthenticatedUser();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAF8] px-5 py-12">
      <section className="w-full max-w-2xl rounded-[20px] border border-[#E4E0D4] bg-white p-7 shadow-[0_4px_16px_rgba(0,0,0,0.06)] sm:p-10">
        <Link className="text-sm font-semibold text-[#2D5A27] hover:underline" href="/dashboard">Back to your wedding</Link>
        <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2D5A27]">New wedding workspace</p>
        <h1 className="mt-2 font-serif text-3xl tracking-[-0.03em] text-[#1C1C1C] sm:text-4xl">Create another wedding</h1>
        <p className="mt-3 text-sm leading-6 text-[#7A7A6E]">You will be the owner of this new wedding. It will become your active workspace, and you can switch back to your other weddings at any time.</p>
        <CreateWeddingForm allowSkip={false} />
      </section>
    </main>
  );
}
