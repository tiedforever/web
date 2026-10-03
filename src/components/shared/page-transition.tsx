"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import {
  getDelayedLoadingFallbackArea,
  isDelayedLoadingFallback,
  useDelayedLoading,
} from "./delayed-loading";
import { weddingQueryKeys } from "../../query-keys";
import type { GuestQueryFilters } from "../../types/guests";

export function PageTransition({
  children,
  weddingId,
}: {
  children: ReactNode;
  weddingId: string | null;
}) {
  const isLoadingFallback = isDelayedLoadingFallback(children);
  const loadingArea = getDelayedLoadingFallbackArea(children);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [previousChildren, setPreviousChildren] = useState<ReactNode>(
    () => (isLoadingFallback ? null : children),
  );

  const hasCachedRouteData = hasCachedDataForRoute(
    queryClient,
    loadingArea,
    weddingId,
    searchParams,
  );
  useDelayedLoading("route", isLoadingFallback && !hasCachedRouteData);

  useEffect(() => {
    if (isLoadingFallback) return;

    // The state update intentionally keeps the last completed page available
    // while the next route's suspense fallback is active.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviousChildren(children);
  }, [children, isLoadingFallback]);

  const displayedChildren = isLoadingFallback ? previousChildren : children;

  return (
    <div className="page-transition">
      {displayedChildren}
    </div>
  );
}

function hasCachedDataForRoute(
  queryClient: ReturnType<typeof useQueryClient>,
  area: ReturnType<typeof getDelayedLoadingFallbackArea>,
  weddingId: string | null,
  searchParams: ReturnType<typeof useSearchParams>,
) {
  if (!area || area === "other" || !weddingId) return false;

  if (area === "dashboard") {
    return queryClient.getQueryData(weddingQueryKeys.dashboard(weddingId)) !== undefined;
  }

  if (area === "checklist") {
    return queryClient.getQueryData(weddingQueryKeys.checklist(weddingId)) !== undefined;
  }

  const filters: GuestQueryFilters = {
    search: searchParams.get("search")?.trim() ?? "",
    ageGroup: searchParams.get("ageGroup") ?? "",
    tagId: searchParams.get("tagId") ?? "",
    sectionId: searchParams.get("sectionId") ?? "",
  };
  return queryClient.getQueryData(weddingQueryKeys.guests(weddingId, filters)) !== undefined;
}
