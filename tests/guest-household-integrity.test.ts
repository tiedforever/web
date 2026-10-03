import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    guest: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    household: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    guestTag: { count: vi.fn() },
    guestTagAssignment: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    guestSectionAssignment: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("../src/server/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("../src/server/logging/logger", () => ({
  logger: { error: vi.fn() },
}));

import {
  guestRepository,
} from "../src/server/repositories/guest.repository";
import {
  HouseholdRepositoryError,
  householdRepository,
} from "../src/server/repositories/household.repository";

const weddingId = "wedding_1";
const householdId = "household_1";
const otherHouseholdId = "household_2";

const guestDetail = {
  id: "guest_1",
  weddingId,
  householdId,
  plusOneForGuestId: null,
  title: null,
  firstName: "Ada",
  lastName: "Lovelace",
  email: null,
  phone: null,
  ageGroup: "ADULT",
  dietaryRequirements: null,
  notes: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  household: null,
  plusOneFor: null,
  plusOnes: [],
  tagAssignments: [],
};

function transactionMock() {
  mocks.prisma.$transaction.mockImplementation(async (callback) => {
    if (typeof callback === "function") return callback(mocks.prisma);
    return Promise.all(callback);
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  transactionMock();
  mocks.prisma.guest.updateMany.mockResolvedValue({ count: 1 });
  mocks.prisma.guestTagAssignment.deleteMany.mockResolvedValue({ count: 0 });
  mocks.prisma.guestTagAssignment.createMany.mockResolvedValue({ count: 1 });
  mocks.prisma.guestSectionAssignment.deleteMany.mockResolvedValue({ count: 1 });
  mocks.prisma.household.updateMany.mockResolvedValue({ count: 1 });
  mocks.prisma.household.update.mockResolvedValue({});
});

describe("household primary integrity", () => {
  it("promotes the deterministic eligible replacement after deleting a primary guest", async () => {
    mocks.prisma.guest.findFirst
      .mockResolvedValueOnce({ id: "guest_primary", householdId })
      .mockResolvedValueOnce({ id: "guest_replacement" });
    mocks.prisma.household.findFirst.mockResolvedValueOnce({
      id: householdId,
      primaryGuestId: null,
    });
    mocks.prisma.guest.findFirst.mockResolvedValueOnce(guestDetail);

    await guestRepository.deleteGuest(weddingId, "guest_primary");

    expect(mocks.prisma.guest.delete).toHaveBeenCalledWith({
      where: { id: "guest_primary" },
    });
    expect(mocks.prisma.guestSectionAssignment.deleteMany).toHaveBeenCalledWith({
      where: { guestId: "guest_primary" },
    });
    expect(mocks.prisma.household.update).toHaveBeenCalledWith({
      where: { id: householdId },
      data: { primaryGuestId: "guest_replacement" },
    });
  });

  it("leaves primaryGuestId null when the deleted guest was the only member", async () => {
    mocks.prisma.guest.findFirst
      .mockResolvedValueOnce({ id: "guest_primary", householdId })
      .mockResolvedValueOnce(null);
    mocks.prisma.household.findFirst.mockResolvedValueOnce({
      id: householdId,
      primaryGuestId: null,
    });

    await guestRepository.deleteGuest(weddingId, "guest_primary");

    expect(mocks.prisma.household.update).toHaveBeenCalledWith({
      where: { id: householdId },
      data: { primaryGuestId: null },
    });
  });

  it("selects a replacement when moving a primary guest to another household", async () => {
    mocks.prisma.guest.findFirst
      .mockResolvedValueOnce({ id: "guest_primary" })
      .mockResolvedValueOnce({
        id: "guest_primary",
        householdId,
        plusOneForGuestId: null,
        plusOneFor: null,
        plusOnes: [],
      });
    mocks.prisma.household.findFirst
      .mockResolvedValueOnce({ id: otherHouseholdId })
      .mockResolvedValueOnce({ id: householdId, primaryGuestId: null })
      .mockResolvedValueOnce({ id: otherHouseholdId, primaryGuestId: null });
    mocks.prisma.guest.findFirst
      .mockResolvedValueOnce({ id: "guest_replacement" })
      .mockResolvedValueOnce({ id: "guest_primary" })
      .mockResolvedValueOnce(guestDetail);

    await guestRepository.updateGuest(weddingId, "guest_primary", {
      householdId: otherHouseholdId,
      firstName: "Ada",
      lastName: "Lovelace",
      ageGroup: "ADULT",
    });

    expect(mocks.prisma.guest.updateMany).toHaveBeenCalledWith({
      where: { weddingId, id: { in: ["guest_primary"] } },
      data: { householdId: otherHouseholdId },
    });
    expect(mocks.prisma.household.update).toHaveBeenCalledWith({
      where: { id: householdId },
      data: { primaryGuestId: "guest_replacement" },
    });
  });

  it("moves a primary and its plus-one together", async () => {
    mocks.prisma.guest.findFirst
      .mockResolvedValueOnce({
        id: "guest_primary",
        householdId,
        plusOneForGuestId: null,
        plusOneFor: null,
        plusOnes: [{ id: "guest_plus_one", householdId, weddingId }],
      })
      .mockResolvedValueOnce({ id: "guest_replacement" })
      .mockResolvedValueOnce({ id: "guest_primary" })
      .mockResolvedValueOnce(guestDetail);
    mocks.prisma.household.findFirst
      .mockResolvedValueOnce({ id: otherHouseholdId })
      .mockResolvedValueOnce({ id: householdId, primaryGuestId: null })
      .mockResolvedValueOnce({ id: otherHouseholdId, primaryGuestId: null });
    await guestRepository.assignGuestToHousehold(
      weddingId,
      "guest_primary",
      otherHouseholdId,
    );

    expect(mocks.prisma.guest.updateMany).toHaveBeenCalledWith({
      where: {
        weddingId,
        id: { in: ["guest_primary", "guest_plus_one"] },
      },
      data: { householdId: otherHouseholdId },
    });
  });

  it("selects a replacement when removing a primary guest", async () => {
    mocks.prisma.guest.findFirst.mockResolvedValueOnce({
      id: "guest_replacement",
    });
    mocks.prisma.household.findFirst
      .mockResolvedValueOnce({ id: householdId })
      .mockResolvedValueOnce({ id: householdId, primaryGuestId: null })
      .mockResolvedValueOnce({ id: householdId, guests: [] });
    mocks.prisma.guest.findMany.mockResolvedValue([
      {
        id: "guest_primary",
        plusOneForGuestId: null,
        plusOnes: [],
      },
    ]);

    await householdRepository.removeGuestsFromHousehold(
      weddingId,
      householdId,
      ["guest_primary"],
    );

    expect(mocks.prisma.household.update).toHaveBeenCalledWith({
      where: { id: householdId },
      data: { primaryGuestId: "guest_replacement" },
    });
  });

  it("does not allow a plus-one to be removed independently", async () => {
    mocks.prisma.household.findFirst.mockResolvedValue({ id: householdId });
    mocks.prisma.guest.findMany.mockResolvedValue([
      {
        id: "guest_plus_one",
        plusOneForGuestId: "guest_parent",
        plusOnes: [],
      },
    ]);

    await expect(
      householdRepository.removeGuestsFromHousehold(
        weddingId,
        householdId,
        ["guest_plus_one"],
      ),
    ).rejects.toThrow("keep them together");
  });

  it("rejects adding a guest from another wedding", async () => {
    mocks.prisma.household.findFirst.mockResolvedValue({ id: householdId });
    mocks.prisma.guest.findMany.mockResolvedValue([]);

    await expect(
      householdRepository.addGuestsToHousehold(
        weddingId,
        householdId,
        ["guest_from_other_wedding"],
      ),
    ).rejects.toThrow("guests were not found");
  });

  it("rejects invalid primary changes", async () => {
    mocks.prisma.household.findFirst.mockResolvedValue({ id: householdId });
    mocks.prisma.guest.count.mockResolvedValue(1);
    mocks.prisma.guest.findFirst.mockResolvedValue(null);

    await expect(
      householdRepository.setPrimaryGuest(
        weddingId,
        householdId,
        "guest_from_other_wedding",
      ),
    ).rejects.toBeInstanceOf(HouseholdRepositoryError);

    mocks.prisma.guest.findFirst.mockResolvedValue({
      id: "guest_plus_one",
      plusOneForGuestId: "guest_parent",
    });
    await expect(
      householdRepository.setPrimaryGuest(weddingId, householdId, "guest_plus_one"),
    ).rejects.toThrow("A plus-one cannot be the primary invitee");

    await expect(
      householdRepository.setPrimaryGuest(weddingId, householdId, null),
    ).rejects.toThrow("must have a primary invitee");
  });

  it("requires a primary guest to be in the requested household", async () => {
    mocks.prisma.household.findFirst.mockResolvedValue({ id: householdId });
    mocks.prisma.guest.count.mockResolvedValue(1);
    mocks.prisma.guest.findFirst.mockResolvedValue(null);

    await expect(
      householdRepository.setPrimaryGuest(
        weddingId,
        householdId,
        "guest_from_another_household",
      ),
    ).rejects.toThrow("must belong to this household");
    expect(mocks.prisma.guest.findFirst).toHaveBeenCalledWith({
      where: {
        id: "guest_from_another_household",
        weddingId,
        householdId,
      },
      select: { id: true, plusOneForGuestId: true },
    });
  });
});

describe("plus-one integrity", () => {
  it("rejects creating an attached guest in a different household", async () => {
    mocks.prisma.household.findFirst.mockResolvedValue({
      id: otherHouseholdId,
    });
    mocks.prisma.guest.findFirst.mockResolvedValue({
      id: "guest_parent",
      householdId,
      plusOneForGuestId: null,
      plusOnes: [],
    });

    await expect(
      guestRepository.createGuest(weddingId, {
        householdId: otherHouseholdId,
        plusOneForGuestId: "guest_parent",
        firstName: "Grace",
        lastName: "Hopper",
        ageGroup: "ADULT",
      }),
    ).rejects.toThrow("same household");
    expect(mocks.prisma.guest.create).not.toHaveBeenCalled();
  });

  it("rejects moving a plus-one away from its parent", async () => {
    mocks.prisma.guest.findFirst.mockResolvedValue({
      id: "guest_plus_one",
      householdId,
      plusOneForGuestId: "guest_parent",
      plusOneFor: { id: "guest_parent", householdId, weddingId },
      plusOnes: [],
    });
    mocks.prisma.household.findFirst.mockResolvedValue({
      id: otherHouseholdId,
    });

    await expect(
      guestRepository.updateGuest(weddingId, "guest_plus_one", {
        householdId: otherHouseholdId,
        firstName: "Grace",
        lastName: "Hopper",
        ageGroup: "ADULT",
      }),
    ).rejects.toThrow("same household");
  });

  it("attaches an eligible existing guest with an authoritative conditional write", async () => {
    mocks.prisma.guest.findFirst
      .mockResolvedValueOnce({
        id: "guest_parent",
        householdId: null,
        plusOneForGuestId: null,
        plusOnes: [],
      })
      .mockResolvedValueOnce({
        id: "guest_plus_one",
        householdId: null,
        plusOneForGuestId: null,
        plusOnes: [],
        household: null,
      })
      .mockResolvedValueOnce(guestDetail);

    await guestRepository.attachExistingGuestAsPlusOne(
      weddingId,
      "guest_parent",
      "guest_plus_one",
    );

    expect(mocks.prisma.guest.updateMany).toHaveBeenCalledWith({
      where: {
        id: "guest_plus_one",
        weddingId,
        householdId: null,
        plusOneForGuestId: null,
      },
      data: { plusOneForGuestId: "guest_parent" },
    });
  });

  it("preserves existing section assignments when attaching a guest as a plus-one", async () => {
    mocks.prisma.guest.findFirst
      .mockResolvedValueOnce({
        id: "guest_parent",
        householdId: null,
        plusOneForGuestId: null,
        plusOnes: [],
      })
      .mockResolvedValueOnce({
        id: "guest_plus_one",
        householdId: null,
        plusOneForGuestId: null,
        plusOnes: [],
        household: null,
      })
      .mockResolvedValueOnce(guestDetail);

    await guestRepository.attachExistingGuestAsPlusOne(
      weddingId,
      "guest_parent",
      "guest_plus_one",
    );

    expect(mocks.prisma.guestSectionAssignment.deleteMany).not.toHaveBeenCalled();
    expect(mocks.prisma.guestSectionAssignment.createMany).not.toHaveBeenCalled();
  });

  it("rejects a stale conditional plus-one attachment instead of re-parenting", async () => {
    mocks.prisma.guest.findFirst
      .mockResolvedValueOnce({
        id: "guest_parent",
        householdId: null,
        plusOneForGuestId: null,
        plusOnes: [],
      })
      .mockResolvedValueOnce({
        id: "guest_plus_one",
        householdId: null,
        plusOneForGuestId: null,
        plusOnes: [],
        household: null,
      });
    mocks.prisma.guest.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      guestRepository.attachExistingGuestAsPlusOne(
        weddingId,
        "guest_parent",
        "guest_plus_one",
      ),
    ).rejects.toThrow("changed before the plus-one relationship");
  });

  it("rejects cross-wedding and different-household attachment", async () => {
    mocks.prisma.guest.findFirst.mockResolvedValueOnce(null);
    await expect(
      guestRepository.attachExistingGuestAsPlusOne(
        weddingId,
        "guest_from_other_wedding",
        "guest_plus_one",
      ),
    ).rejects.toThrow("Guest not found in this wedding");

    mocks.prisma.guest.findFirst
      .mockResolvedValueOnce({
        id: "guest_parent",
        householdId,
        plusOneForGuestId: null,
        plusOnes: [],
      })
      .mockResolvedValueOnce({
        id: "guest_plus_one",
        householdId: otherHouseholdId,
        plusOneForGuestId: null,
        plusOnes: [],
        household: null,
      });
    await expect(
      guestRepository.attachExistingGuestAsPlusOne(
        weddingId,
        "guest_parent",
        "guest_plus_one",
      ),
    ).rejects.toThrow("same household");
  });
});

describe("atomic guest and tag updates", () => {
  const input = {
    householdId: null,
    firstName: "Ada",
    lastName: "Lovelace",
    ageGroup: "ADULT" as const,
  };

  it("updates guest fields and tags inside one transaction", async () => {
    mocks.prisma.guest.findFirst
      .mockResolvedValueOnce({ id: "guest_1" })
      .mockResolvedValueOnce({
        id: "guest_1",
        householdId: null,
        plusOneForGuestId: null,
        plusOneFor: null,
        plusOnes: [],
      })
      .mockResolvedValueOnce(guestDetail);
    mocks.prisma.guestTag.count.mockResolvedValue(1);

    await guestRepository.updateGuest(weddingId, "guest_1", input, ["tag_1"]);

    expect(mocks.prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: "Serializable" },
    );
    expect(mocks.prisma.guestTagAssignment.deleteMany).toHaveBeenCalledWith({
      where: { guestId: "guest_1" },
    });
    expect(mocks.prisma.guest.update).toHaveBeenCalled();
  });

  it("does not update guest fields when tag persistence fails", async () => {
    mocks.prisma.guest.findFirst
      .mockResolvedValueOnce({ id: "guest_1" })
      .mockResolvedValueOnce({
        id: "guest_1",
        householdId: null,
        plusOneForGuestId: null,
        plusOneFor: null,
        plusOnes: [],
      });
    mocks.prisma.guestTag.count.mockResolvedValue(1);
    mocks.prisma.guestTagAssignment.createMany.mockRejectedValue(
      new Error("tag write failed"),
    );

    await expect(
      guestRepository.updateGuest(weddingId, "guest_1", input, ["tag_1"]),
    ).rejects.toThrow("Unable to update guest");
    expect(mocks.prisma.guest.update).not.toHaveBeenCalled();
  });
});

describe("household creation", () => {
  it("keeps normal household creation transactional", async () => {
    mocks.prisma.guestTag.count.mockResolvedValue(0);
    mocks.prisma.household.findFirst.mockResolvedValue({
      id: householdId,
      guests: [],
    });

    await householdRepository.createHouseholdWithGuests(weddingId, {
      household: {
        name: "Lovelace household",
        addressLineOne: "1 Test Street",
        townCity: "London",
        postcode: "AA1 1AA",
        country: "United Kingdom",
      },
      guests: [
        {
          firstName: "Ada",
          lastName: "Lovelace",
          ageGroup: "ADULT",
          tagIds: [],
        },
      ],
      primaryGuestIndex: 0,
    });

    expect(mocks.prisma.$transaction).toHaveBeenCalled();
    expect(mocks.prisma.household.create).toHaveBeenCalled();
    expect(mocks.prisma.guest.create).toHaveBeenCalled();
    expect(mocks.prisma.household.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { primaryGuestId: expect.any(String) } }),
    );
  });

  it("deletes a household without deleting its guests", async () => {
    mocks.prisma.household.findFirst.mockResolvedValue({ id: householdId });

    await householdRepository.deleteHousehold(weddingId, householdId);

    expect(mocks.prisma.guest.updateMany).toHaveBeenCalledWith({
      where: { weddingId, householdId },
      data: { householdId: null },
    });
    expect(mocks.prisma.household.delete).toHaveBeenCalledWith({
      where: { id: householdId },
    });
    expect(mocks.prisma.guest.delete).not.toHaveBeenCalled();
  });

  it("does not allow the legacy empty-household repository path", async () => {
    await expect(
      householdRepository.createHousehold(),
    ).rejects.toThrow("at least one guest");
  });
});
