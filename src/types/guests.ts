import type {
  GuestListData,
  GuestListFilters,
  GuestListSection,
} from "@/src/server/repositories/guest-list.repository";

export type GuestQueryFilters = {
  search: string;
  ageGroup: string;
  tagId: string;
  sectionId: string;
};

export type GuestsReadData = {
  guestList: GuestListData;
  sections: GuestListSection[];
};

export function normalizeGuestQueryFilters(
  filters: GuestListFilters = {},
): GuestQueryFilters {
  return {
    search: filters.search?.trim() ?? "",
    ageGroup: filters.ageGroup ?? "",
    tagId: filters.tagId ?? "",
    sectionId: filters.sectionId ?? "",
  };
}
