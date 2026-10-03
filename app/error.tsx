"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button, Card } from "@/src/components/shared/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      console.error("[app] uncaught route error", error.digest);
    } else {
      console.error("[app] uncaught route error", error);
    }
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAF8] px-5 py-12">
      <Card className="w-full max-w-xl border-[#E7C9C5] bg-[#FFF8F6] p-6 text-[#5C211B] sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9D3F32]">
          Something went wrong
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Tied Forever could not load this page</h1>
        <p className="mt-3 text-sm leading-6 text-[#7A4A43]">
          Try again, or return to the dashboard if the problem continues.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={reset} variant="primary">
            Try again
          </Button>
          <Link
            className="rounded-[10px] border border-[#D9D6C9] bg-white px-4 py-2 text-sm font-medium text-[#5C211B] hover:bg-[#FFF5F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D3F32] focus-visible:ring-offset-2"
            href="/dashboard"
          >
            Return to dashboard
          </Link>
        </div>
      </Card>
    </main>
  );
}
