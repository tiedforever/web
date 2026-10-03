import type { ChecklistReadData } from "@/src/server/actions/checklist/checklist.actions";
import { fetchQueryData } from "@/src/client/query-fetch";
import { weddingQueryKeys } from "@/src/query-keys";
import type { DashboardQueryData } from "@/src/types/dashboard";
import type { GuestQueryFilters, GuestsReadData } from "@/src/types/guests";

export function checklistQueryOptions(weddingId: string) {
  return {
    queryKey: weddingQueryKeys.checklist(weddingId),
    queryFn: () =>
      fetchQueryData<ChecklistReadData>(
        `/api/weddings/${encodeURIComponent(weddingId)}/checklist`,
      ),
  };
}

export function dashboardQueryOptions(weddingId: string) {
  return {
    queryKey: weddingQueryKeys.dashboard(weddingId),
    queryFn: () =>
      fetchQueryData<DashboardQueryData>(
        `/api/weddings/${encodeURIComponent(weddingId)}/dashboard`,
      ),
  };
}

export function guestsQueryOptions(weddingId: string, filters: GuestQueryFilters) {
  const searchParams = new URLSearchParams();

  if (filters.search) searchParams.set("search", filters.search);
  if (filters.ageGroup) searchParams.set("ageGroup", filters.ageGroup);
  if (filters.tagId) searchParams.set("tagId", filters.tagId);
  if (filters.sectionId) searchParams.set("sectionId", filters.sectionId);

  const queryString = searchParams.toString();

  return {
    queryKey: weddingQueryKeys.guests(weddingId, filters),
    queryFn: () =>
      fetchQueryData<GuestsReadData>(
        `/api/weddings/${encodeURIComponent(weddingId)}/guests${queryString ? `?${queryString}` : ""}`,
      ),
  };
}
