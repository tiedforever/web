"use client";

import { useAuth } from "@clerk/nextjs";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";

const queryClientDefaults = {
  queries: {
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
  },
};

export function createQueryClient() {
  return new QueryClient({ defaultOptions: queryClientDefaults });
}

export function shouldClearQueryCache(
  previousUserId: string | null | undefined,
  userId: string | null | undefined,
  isLoaded: boolean,
) {
  return isLoaded && previousUserId !== undefined && previousUserId !== userId;
}

function ClearQueryCacheWhenUserChanges() {
  const { isLoaded, userId } = useAuth();
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;

    if (shouldClearQueryCache(previousUserId.current, userId, isLoaded)) {
      queryClient.clear();
    }

    previousUserId.current = userId;
  }, [isLoaded, queryClient, userId]);

  return null;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ClearQueryCacheWhenUserChanges />
      {children}
    </QueryClientProvider>
  );
}
