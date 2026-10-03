import Link from "next/link";

import { Card } from "@/src/components/shared/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAF8] px-5 py-12">
      <Card className="w-full max-w-xl p-6 text-center sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2D5A27]">
          Tied Forever
        </p>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7A7A6E]">
          Page not found
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[#1C1C1C]">That page does not exist</h1>
        <p className="mt-3 text-sm leading-6 text-[#7A7A6E]">
          The page may have moved, or the link may no longer be available.
        </p>
        <Link
          className="mt-6 inline-flex rounded-[10px] bg-[#2D5A27] px-4 py-2 text-sm font-medium text-white hover:bg-[#245020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A27] focus-visible:ring-offset-2"
          href="/"
        >
          Back to home
        </Link>
      </Card>
    </main>
  );
}
