import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  createGuestWithPlusOne: vi.fn(),
  addPlusOne: vi.fn(),
  updateGuest: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
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
vi.mock("../src/server/logging/logger", () => ({
  logger: { error: vi.fn() },
}));
vi.mock("../src/server/repositories/guest.repository", () => ({
  GuestRepositoryError: class GuestRepositoryError extends Error {},
  guestRepository: {
    createGuestWithPlusOne: mocks.createGuestWithPlusOne,
    addPlusOne: mocks.addPlusOne,
    updateGuest: mocks.updateGuest,
  },
}));

import {
  addPlusOne,
  createGuest,
  updateGuest,
} from "../src/server/actions/guests/guest.actions";

const guestId = "11111111-1111-4111-8111-111111111111";
const ceremonyId = "22222222-2222-4222-8222-222222222222";
const venueId = "33333333-3333-4333-8333-333333333333";

function guestRecord() {
  return {
    id: guestId,
    weddingId: "wedding_1",
    householdId: null,
    plusOneForGuestId: null,
    title: null,
    firstName: "Ada",
    lastName: "Lovelace",
    email: null,
    phone: null,
    ageGroup: "ADULT" as const,
    dietaryRequirements: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    household: null,
    plusOneFor: null,
    plusOnes: [],
    tagAssignments: [],
    sectionAssignments: [
      { section: { id: ceremonyId, name: "Ceremony", active: true, position: 0 } },
      { section: { id: venueId, name: "Venue", active: true, position: 1 } },
    ],
  };
}

const baseInput = {
  firstName: "Ada",
  lastName: "Lovelace",
  ageGroup: "ADULT",
  householdId: "",
  tagIds: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue({ wedding: { id: "wedding_1" }, role: "EDITOR" });
  mocks.createGuestWithPlusOne.mockResolvedValue(guestRecord());
  mocks.addPlusOne.mockResolvedValue(guestRecord());
  mocks.updateGuest.mockResolvedValue(guestRecord());
});

describe("guest section assignment actions", () => {
  it("passes one, multiple, and all selected sections to the transactional repository", async () => {
    await createGuest({ ...baseInput, sectionIds: [ceremonyId] });
    await createGuest({ ...baseInput, sectionIds: [ceremonyId, venueId] });
    await createGuest({ ...baseInput, sectionIds: [ceremonyId, venueId] });

    expect(mocks.createGuestWithPlusOne).toHaveBeenNthCalledWith(
      1,
      "wedding_1",
      expect.objectContaining({ primarySectionIds: [ceremonyId] }),
    );
    expect(mocks.createGuestWithPlusOne).toHaveBeenNthCalledWith(
      2,
      "wedding_1",
      expect.objectContaining({ primarySectionIds: [ceremonyId, venueId] }),
    );
  });

  it("allows a guest to be created with no selected sections", async () => {
    const result = await createGuest({ ...baseInput, sectionIds: [] });

    expect(result.success).toBe(true);
    expect(mocks.createGuestWithPlusOne).toHaveBeenCalledWith(
      "wedding_1",
      expect.objectContaining({ primarySectionIds: [] }),
    );
  });

  it("passes plus-one section selections separately through both create paths", async () => {
    await createGuest({
      ...baseInput,
      sectionIds: [ceremonyId],
      plusOne: {
        firstName: "Grace",
        lastName: "Hopper",
        sectionIds: [venueId],
      },
    });

    expect(mocks.createGuestWithPlusOne).toHaveBeenCalledWith(
      "wedding_1",
      expect.objectContaining({
        primarySectionIds: [ceremonyId],
        plusOneSectionIds: [venueId],
        plusOne: expect.objectContaining({ firstName: "Grace" }),
      }),
    );

    await addPlusOne(guestId, {
      firstName: "Grace",
      lastName: "Hopper",
      sectionIds: [ceremonyId, venueId],
    });

    expect(mocks.addPlusOne).toHaveBeenCalledWith(
      "wedding_1",
      guestId,
      expect.objectContaining({ firstName: "Grace" }),
      [ceremonyId, venueId],
    );
  });

  it("updates assignments and rejects duplicate browser selections", async () => {
    await updateGuest(guestId, {
      ...baseInput,
      sectionIds: [venueId],
    });

    expect(mocks.updateGuest).toHaveBeenCalledWith(
      "wedding_1",
      guestId,
      expect.objectContaining({ firstName: "Ada" }),
      [],
      [venueId],
    );

    const duplicate = await updateGuest(guestId, {
      ...baseInput,
      sectionIds: [ceremonyId, ceremonyId],
    });
    expect(duplicate).toEqual({
      success: false,
      error: "A wedding section cannot be selected more than once",
    });
  });
});
