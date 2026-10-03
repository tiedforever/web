import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

import {
  SITE_DESCRIPTION,
} from "@/src/seo/site-metadata";

export const metadata: Metadata = {
  title: { absolute: "Tied Forever" },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Tied Forever",
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: "Tied Forever",
    type: "website",
  },
};

export default async function Home() {
  const { isAuthenticated } = await auth();

  if (isAuthenticated) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAF8] px-5 py-12">
      <section className="w-full max-w-3xl rounded-[20px] border border-[#E4E0D4] bg-white p-8 text-center shadow-[0_4px_16px_rgba(0,0,0,0.06)] sm:p-12">
        <header>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#2D5A27] to-[#C4973A] text-white">
            <span aria-hidden="true" className="text-xl">✦</span>
          </div>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2D5A27]">
            Tied Forever · Wedding planning workspace
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-[-0.03em] text-[#1C1C1C] sm:text-5xl">
            Plan your wedding together, with less chaos.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#7A7A6E]">
            Tied Forever brings your checklist, guest list, and shared wedding workspace into one calm place for you and your planning team.
          </p>
        </header>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            className="rounded-[10px] bg-[#2D5A27] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#245020]"
            href="/sign-up"
          >
            Start planning
          </Link>
          <Link
            className="rounded-[10px] border border-[#E4E0D4] bg-[#F4F4F1] px-5 py-2.5 text-sm font-medium text-[#1C1C1C] transition hover:bg-[#EAEAE7]"
            href="/sign-in"
          >
            Sign in
          </Link>
        </div>

        <section
          aria-label="What you can plan"
          className="mt-10 grid gap-5 border-t border-[#F0EFEA] pt-8 text-left sm:grid-cols-3"
        >
          <div>
            <h2 className="text-sm font-semibold text-[#1C1C1C]">A clear checklist</h2>
            <p className="mt-1.5 text-xs leading-5 text-[#7A7A6E]">
              Keep the next steps visible and share the work as plans take shape.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#1C1C1C]">Guest details together</h2>
            <p className="mt-1.5 text-xs leading-5 text-[#7A7A6E]">
              Organise guests, households, tags, and the details you need close at hand.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#1C1C1C]">One shared workspace</h2>
            <p className="mt-1.5 text-xs leading-5 text-[#7A7A6E]">
              Plan with your partner and the people helping you bring the day together.
            </p>
          </div>
        </section>

        <footer className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[#F0EFEA] pt-5 text-xs text-[#8A8A82] sm:flex-row">
          <span>© {new Date().getFullYear()} Tied Forever</span>
          <nav aria-label="Public navigation" className="flex items-center gap-4">
            <Link className="hover:text-[#2D5A27]" href="/sign-in">Sign in</Link>
            <Link className="font-semibold text-[#2D5A27] hover:underline" href="/sign-up">Get started</Link>
          </nav>
        </footer>
      </section>
    </main>
  );
}
