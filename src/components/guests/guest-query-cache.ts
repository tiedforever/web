import type { QueryClient } from "@tanstack/react-query";

import { weddingQueryKeys } from "@/src/query-keys";

export function invalidateGuestsQuery(
  queryClient: QueryClient,
  weddingId: string,
) {
  return queryClient.invalidateQueries({
    queryKey: weddingQueryKeys.guestsFamily(weddingId),
  });
}

export function invalidateGuestsAndDashboardQueries(
  queryClient: QueryClient,
  weddingId: string,
) {
  return Promise.all([
    invalidateGuestsQuery(queryClient, weddingId),
    queryClient.invalidateQueries({
      queryKey: weddingQueryKeys.dashboard(weddingId),
    }),
  ]);
}
