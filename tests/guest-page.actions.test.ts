import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class GuestListRepositoryError extends Error {}
  class WeddingSectionRepositoryError extends Error {}

  return {
    requireRole: vi.fn(),
    getGuestList: vi.fn(),
    getSections: vi.fn(),
    logger: { error: vi.fn() },
    GuestListRepositoryError,
    WeddingSectionRepositoryError,
  };
});

vi.mock("server-only", () => ({}));
vi.mock("../src/server/auth/authorization", () => ({
  PermissionDeniedError: class PermissionDeniedError extends Error {},
  requireRole: mocks.requireRole,
}));
vi.mock("../src/server/auth/get-active-wedding", () => ({
  ActiveWeddingRequiredError: class ActiveWeddingRequiredError extends Error {},
}));
vi.mock("../src/server/auth/get-authenticated-user", () => ({
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
}));
vi.mock("../src/server/logging/logger", () => ({ logger: mocks.logger }));
vi.mock("../src/server/repositories/guest-list.repository", () => ({
  GuestListRepositoryError: mocks.GuestListRepositoryError,
  guestListRepository: { getGuestList: mocks.getGuestList },
  parseGuestListFilters: (input: Record<string, unknown>) => ({
    value: {
      search: typeof input.search === "string" ? input.search : undefined,
      ageGroup: typeof input.ageGroup === "string" ? input.ageGroup : undefined,
      tagId: typeof input.tagId === "string" ? input.tagId : undefined,
      sectionId: typeof input.sectionId === "string" ? input.sectionId : undefined,
    },
  }),
}));
vi.mock("../src/server/repositories/wedding-section.repository", () => ({
  WeddingSectionRepositoryError: mocks.WeddingSectionRepositoryError,
  weddingSectionRepository: { getSections: mocks.getSections },
}));

import { getGuestsPageData } from "../src/server/actions/guests/guest-page.actions";

const guestList = {
  standaloneGuests: [],
  households: [],
  tags: [{ id: "tag_1", name: "Family" }],
};

const sections = [{
  id: "section_1",
  name: "Ceremony",
  description: "The ceremony",
  position: 0,
  active: true,
}];

describe("Guests page read action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ wedding: { id: "wedding_1" } });
    mocks.getGuestList.mockResolvedValue(guestList);
    mocks.getSections.mockResolvedValue(sections);
  });

  it("loads the wedding-scoped guest list and sections concurrently with the requested filters", async () => {
    const result = await getGuestsPageData(
      { search: "Ada", ageGroup: "ADULT", tagId: "tag_1", sectionId: "section_1" },
      "wedding_1",
    );

    expect(result).toEqual({
      success: true,
      data: {
        guestList,
        sections: [{ id: "section_1", name: "Ceremony", active: true }],
      },
    });
    expect(mocks.getGuestList).toHaveBeenCalledWith("wedding_1", {
      search: "Ada",
      ageGroup: "ADULT",
      tagId: "tag_1",
      sectionId: "section_1",
    });
    expect(mocks.getSections).toHaveBeenCalledWith("wedding_1");
  });

  it("does not read data when the authorized wedding does not match the expected wedding", async () => {
    const result = await getGuestsPageData({}, "wedding_2");

    expect(result).toEqual({ success: false, error: "Guest list not found." });
    expect(mocks.getGuestList).not.toHaveBeenCalled();
    expect(mocks.getSections).not.toHaveBeenCalled();
  });
});
