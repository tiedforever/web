import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  revalidatePath: vi.fn(),
  createGuestWithPlusOne: vi.fn(),
  addPlusOne: vi.fn(),
  deleteGuest: vi.fn(),
  updateGuest: vi.fn(),
  deleteHousehold: vi.fn(),
  createHousehold: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("../src/server/auth/authorization", () => ({
  PermissionDeniedError: class PermissionDeniedError extends Error {
    constructor() {
      super("You do not have permission to perform this action.");
      this.name = "PermissionDeniedError";
    }
  },
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
    deleteGuest: mocks.deleteGuest,
    updateGuest: mocks.updateGuest,
  },
}));
vi.mock("../src/server/repositories/household.repository", () => ({
  HouseholdRepositoryError: class HouseholdRepositoryError extends Error {},
  householdRepository: {
    createHousehold: mocks.createHousehold,
    deleteHousehold: mocks.deleteHousehold,
  },
}));

import { PermissionDeniedError } from "../src/server/auth/authorization";
import {
  addPlusOne,
  createGuest,
  deleteGuest,
  updateGuest,
} from "../src/server/actions/guests/guest.actions";
import {
  createHousehold,
  deleteHousehold,
} from "../src/server/actions/guests/household.actions";

const guestId = "11111111-1111-4111-8111-111111111111";
const householdId = "22222222-2222-4222-8222-222222222222";

describe("guest and household mutation authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockRejectedValue(new PermissionDeniedError());
  });

  it("keeps guest deletion rejected for VIEWER users", async () => {
    const result = await deleteGuest(guestId);

    expect(result).toEqual({
      success: false,
      error: "You do not have permission to perform this action.",
    });
    expect(mocks.deleteGuest).not.toHaveBeenCalled();
  });

  it("invalidates dashboard counts after guest and household deletions", async () => {
    mocks.requireRole.mockResolvedValue({
      wedding: { id: "wedding_1" },
      role: "EDITOR",
    });
    mocks.deleteGuest.mockResolvedValue(undefined);
    mocks.deleteHousehold.mockResolvedValue(undefined);

    await deleteGuest(guestId);
    await deleteHousehold(householdId);

    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("keeps guest section assignment changes rejected for VIEWER users", async () => {
    const result = await updateGuest(guestId, {
      firstName: "Ada",
      lastName: "Lovelace",
      ageGroup: "ADULT",
      sectionIds: [],
      tagIds: [],
    });

    expect(result).toEqual({
      success: false,
      error: "You do not have permission to perform this action.",
    });
    expect(mocks.updateGuest).not.toHaveBeenCalled();
  });

  it("does not allow VIEWER users to create or add plus-one section assignments", async () => {
    const createResult = await createGuest({
      firstName: "Ada",
      lastName: "Lovelace",
      ageGroup: "ADULT",
      sectionIds: [],
      tagIds: [],
      plusOne: {
        firstName: "Grace",
        lastName: "Hopper",
        sectionIds: [],
      },
    });
    const addResult = await addPlusOne(guestId, {
      firstName: "Grace",
      lastName: "Hopper",
      sectionIds: [],
    });

    expect(createResult).toEqual({
      success: false,
      error: "You do not have permission to perform this action.",
    });
    expect(addResult).toEqual({
      success: false,
      error: "You do not have permission to perform this action.",
    });
    expect(mocks.createGuestWithPlusOne).not.toHaveBeenCalled();
    expect(mocks.addPlusOne).not.toHaveBeenCalled();
  });

  it("keeps household deletion rejected for VIEWER users", async () => {
    const result = await deleteHousehold(householdId);

    expect(result).toEqual({
      success: false,
      error: "You do not have permission to perform this action.",
    });
    expect(mocks.deleteHousehold).not.toHaveBeenCalled();
  });

  it("does not expose an empty-household creation path", async () => {
    mocks.requireRole.mockResolvedValue({
      wedding: { id: "wedding_1" },
      role: "EDITOR",
    });

    const result = await createHousehold({
      name: "Empty household",
      addressLineOne: "1 Test Street",
      townCity: "London",
      postcode: "AA1 1AA",
      country: "United Kingdom",
    });

    expect(result).toEqual({
      success: false,
      error: "A household must be created with at least one guest",
    });
    expect(mocks.createHousehold).not.toHaveBeenCalled();
  });
});
