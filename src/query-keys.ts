import type { GuestQueryFilters } from "@/src/types/guests";

export const weddingQueryKeys = {
  all: ["wedding"] as const,
  checklist: (weddingId: string) =>
    ["wedding", weddingId, "checklist"] as const,
  dashboard: (weddingId: string) =>
    ["wedding", weddingId, "dashboard"] as const,
  guests: (weddingId: string, filters: GuestQueryFilters) =>
    ["wedding", weddingId, "guests", filters] as const,
  guestsFamily: (weddingId: string) =>
    ["wedding", weddingId, "guests"] as const,
  guestSections: (weddingId: string) =>
    ["wedding", weddingId, "guest-sections"] as const,
  guestTags: (weddingId: string) =>
    ["wedding", weddingId, "guest-tags"] as const,
  guestHouseholds: (weddingId: string) =>
    ["wedding", weddingId, "guest-households"] as const,
};
