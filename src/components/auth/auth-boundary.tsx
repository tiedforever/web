"use client";

import { Show } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AccountAccessState, type AccountAccessError } from "./account-access-state";

import {
  AppShell,
  type AppShellContext,
} from "@/src/components/shared/app-shell";

export function AuthBoundary({
  children,
  context,
  accountError,
}: {
  children: ReactNode;
  context: AppShellContext | null;
  accountError?: AccountAccessError;
}) {
  const pathname = usePathname();
  const isOnboarding =
    pathname === "/onboarding" || pathname.startsWith("/onboarding/") || pathname === "/weddings/new";
  const isWorkspaceInvitation = pathname === "/invitations/accept";

  return (
    <>
      <Show when="signed-in">
        {isWorkspaceInvitation ? children : accountError ? <AccountAccessState error={accountError} /> : isOnboarding ? children : <AppShell context={context}>{children}</AppShell>}
      </Show>
      <Show when="signed-out">{children}</Show>
    </>
  );
}
