"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ChecklistQueryView } from "@/src/components/checklist/checklist-query-view";
import { DashboardQueryView } from "@/src/components/dashboard/dashboard-query-view";
import { GuestsQueryView } from "@/src/components/guests/guests-query-view";
import { useWorkspaceContext } from "@/src/components/shared/workspace-context";
import { WeddingRequiredState } from "@/src/components/shared/wedding-required-state";
import type { GuestQueryFilters } from "@/src/types/guests";

export function DashboardWorkspaceView() {
  const workspace = useWorkspaceContext();
  const router = useRouter();
  const shouldRedirectToOnboarding =
    workspace !== null &&
    workspace.wedding === null &&
    !workspace.onboardingSkipped;

  useEffect(() => {
    if (shouldRedirectToOnboarding) {
      router.replace("/onboarding");
    }
  }, [router, shouldRedirectToOnboarding]);

  if (!workspace?.wedding) {
    return shouldRedirectToOnboarding ? null : <WeddingRequiredState feature="Your dashboard" />;
  }

  const { wedding } = workspace;

  return (
    <DashboardQueryView
      presentation={{
        userFirstName: workspace.user.firstName,
        weddingName: wedding.weddingName,
        partnerNames: wedding.partnerNames,
        weddingDate: wedding.weddingDateIso,
        timezone: wedding.timezone,
        locationSummary: wedding.locationSummary,
      }}
      weddingId={wedding.id}
    />
  );
}

export function ChecklistWorkspaceView() {
  const workspace = useWorkspaceContext();

  if (!workspace?.wedding) {
    return <WeddingRequiredState feature="Your checklist" />;
  }

  const { wedding } = workspace;

  return (
    <ChecklistQueryView
      canEdit={workspace.role === "OWNER" || workspace.role === "EDITOR"}
      weddingDate={wedding.weddingDateIso}
      weddingId={wedding.id}
      weddingName={wedding.weddingName}
      timezone={wedding.timezone}
    />
  );
}

export function GuestsWorkspaceView({
  filters,
}: {
  filters: GuestQueryFilters;
}) {
  const workspace = useWorkspaceContext();
  const searchParams = useSearchParams();

  if (!workspace?.wedding) {
    return <WeddingRequiredState feature="Your guest list" />;
  }

  // Keep the server-validated initial filters for the first render. Once the
  // URL changes client-side, derive the same normalized key before the RSC
  // payload arrives so a previously viewed filter combination can be reused.
  const currentFilters = normalizeGuestFilters(searchParams, filters);
  const { wedding } = workspace;

  return (
    <GuestsQueryView
      canEdit={workspace.role === "OWNER" || workspace.role === "EDITOR"}
      filters={currentFilters}
      partnerNames={wedding.partnerNames}
      weddingId={wedding.id}
    />
  );
}

function normalizeGuestFilters(
  searchParams: ReturnType<typeof useSearchParams>,
  fallback: GuestQueryFilters,
): GuestQueryFilters {
  if (!searchParams.toString()) return fallback;

  return {
    search: searchParams.get("search")?.trim() ?? "",
    ageGroup: searchParams.get("ageGroup") ?? "",
    tagId: searchParams.get("tagId") ?? "",
    sectionId: searchParams.get("sectionId") ?? "",
  };
}
