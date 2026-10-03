import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    guest: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    household: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    guestTag: { count: vi.fn() },
    guestTagAssignment: { deleteMany: vi.fn(), createMany: vi.fn() },
    weddingSection: { findMany: vi.fn() },
    guestSectionAssignment: {
      findMany: vi.fn(),
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

import { guestRepository } from "../src/server/repositories/guest.repository";

const weddingId = "wedding_1";
const guestInput = {
  firstName: "Ada",
  lastName: "Lovelace",
  ageGroup: "ADULT" as const,
  householdId: null,
};
const plusOneInput = {
  firstName: "Grace",
  lastName: "Hopper",
  ageGroup: "ADULT" as const,
};
const sections = [
  { id: "section_ceremony", active: true },
  { id: "section_venue", active: true },
  { id: "section_evening", active: true },
];

function guestDetail() {
  return {
    id: "guest_1",
    weddingId,
    householdId: null,
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
    sectionAssignments: [],
  };
}

function transactionMock() {
  mocks.prisma.$transaction.mockImplementation(async (callback) => callback(mocks.prisma));
}

beforeEach(() => {
  vi.clearAllMocks();
  transactionMock();
  mocks.prisma.guestTag.count.mockResolvedValue(0);
  mocks.prisma.guest.create.mockResolvedValue({ id: "guest_1" });
  mocks.prisma.guest.update.mockResolvedValue({});
  mocks.prisma.guest.delete.mockResolvedValue({});
  mocks.prisma.guestSectionAssignment.findMany.mockResolvedValue([]);
  mocks.prisma.guestSectionAssignment.deleteMany.mockResolvedValue({ count: 0 });
  mocks.prisma.guestSectionAssignment.createMany.mockResolvedValue({ count: 1 });
  mocks.prisma.guest.findFirst.mockResolvedValue(guestDetail());
  mocks.prisma.household.findFirst.mockResolvedValue(null);
  mocks.prisma.household.updateMany.mockResolvedValue({ count: 0 });
});

describe("guest wedding section assignments", () => {
  it("supports one, multiple, all active sections, and zero sections", async () => {
    for (const selected of [
      ["section_ceremony"],
      ["section_ceremony", "section_venue"],
      sections.map((section) => section.id),
      [],
    ]) {
      vi.clearAllMocks();
      transactionMock();
      mocks.prisma.guestTag.count.mockResolvedValue(0);
      mocks.prisma.guest.create.mockResolvedValue({ id: "guest_1" });
      mocks.prisma.guest.findFirst.mockResolvedValue(guestDetail());
      mocks.prisma.weddingSection.findMany.mockResolvedValue(
        sections.filter((section) => selected.includes(section.id)),
      );

      await guestRepository.createGuest(weddingId, guestInput, selected);

      if (selected.length > 0) {
        expect(mocks.prisma.guestSectionAssignment.createMany).toHaveBeenCalledWith({
          data: selected.map((sectionId) => ({ guestId: "guest_1", sectionId })),
        });
      } else {
        expect(mocks.prisma.guestSectionAssignment.createMany).not.toHaveBeenCalled();
      }
    }
  });

  it("deduplicates assignment input before writing the composite-key join", async () => {
    mocks.prisma.weddingSection.findMany.mockResolvedValue([sections[0]]);

    await guestRepository.createGuest(
      weddingId,
      guestInput,
      ["section_ceremony", "section_ceremony"],
    );

    expect(mocks.prisma.guestSectionAssignment.createMany).toHaveBeenCalledWith({
      data: [{ guestId: "guest_1", sectionId: "section_ceremony" }],
    });
  });

  it("creates a plus-one with one, multiple, all, or zero independent sections", async () => {
    for (const selected of [
      ["section_ceremony"],
      ["section_ceremony", "section_venue"],
      sections.map((section) => section.id),
      [],
    ]) {
      vi.clearAllMocks();
      transactionMock();
      mocks.prisma.guestTag.count.mockResolvedValue(0);
      mocks.prisma.guest.create.mockResolvedValue({ id: "guest_1" });
      mocks.prisma.guest.findFirst.mockResolvedValue(guestDetail());
      mocks.prisma.guestSectionAssignment.createMany.mockResolvedValue({ count: selected.length });
      mocks.prisma.weddingSection.findMany.mockImplementation(async ({ where }) =>
        sections.filter((section) => where.id.in.includes(section.id)),
      );

      await guestRepository.createGuestWithPlusOne(weddingId, {
        primary: guestInput,
        plusOne: plusOneInput,
        primaryTagIds: [],
        primarySectionIds: [],
        plusOneSectionIds: selected,
      });

      const plusOneId = mocks.prisma.guest.create.mock.calls[1][0].data.id;
      if (selected.length > 0) {
        expect(mocks.prisma.guestSectionAssignment.createMany).toHaveBeenCalledWith({
          data: selected.map((sectionId) => ({ guestId: plusOneId, sectionId })),
        });
      } else {
        expect(mocks.prisma.guestSectionAssignment.createMany).not.toHaveBeenCalled();
      }
    }
  });

  it("keeps parent and plus-one section assignments independent", async () => {
    mocks.prisma.weddingSection.findMany.mockImplementation(async ({ where }) =>
      sections.filter((section) => where.id.in.includes(section.id)),
    );

    await guestRepository.createGuestWithPlusOne(weddingId, {
      primary: guestInput,
      plusOne: plusOneInput,
      primaryTagIds: [],
      primarySectionIds: ["section_ceremony"],
      plusOneSectionIds: ["section_venue"],
    });

    const [primaryCreate, plusOneCreate] = mocks.prisma.guest.create.mock.calls;
    expect(mocks.prisma.guestSectionAssignment.createMany).toHaveBeenNthCalledWith(1, {
      data: [{ guestId: primaryCreate[0].data.id, sectionId: "section_ceremony" }],
    });
    expect(mocks.prisma.guestSectionAssignment.createMany).toHaveBeenNthCalledWith(2, {
      data: [{ guestId: plusOneCreate[0].data.id, sectionId: "section_venue" }],
    });
  });

  it("rejects cross-wedding and inactive section assignments", async () => {
    mocks.prisma.weddingSection.findMany.mockResolvedValue([]);
    await expect(
      guestRepository.createGuest(weddingId, guestInput, ["section_other_wedding"]),
    ).rejects.toThrow("not found in this wedding");
    expect(mocks.prisma.guest.create).not.toHaveBeenCalled();

    vi.clearAllMocks();
    transactionMock();
    mocks.prisma.weddingSection.findMany.mockResolvedValue([
      { id: "section_inactive", active: false },
    ]);
    await expect(
      guestRepository.createGuest(weddingId, guestInput, ["section_inactive"]),
    ).rejects.toThrow("cannot be newly assigned");
    expect(mocks.prisma.guest.create).not.toHaveBeenCalled();

    vi.clearAllMocks();
    transactionMock();
    mocks.prisma.guestTag.count.mockResolvedValue(0);
    mocks.prisma.weddingSection.findMany.mockResolvedValue([
      { id: "section_inactive", active: false },
    ]);
    await expect(
      guestRepository.createGuestWithPlusOne(weddingId, {
        primary: guestInput,
        plusOne: plusOneInput,
        primaryTagIds: [],
        plusOneSectionIds: ["section_inactive"],
      }),
    ).rejects.toThrow("cannot be newly assigned");
    expect(mocks.prisma.guest.create).not.toHaveBeenCalled();
  });

  it("rolls back a new plus-one when section assignment persistence fails", async () => {
    mocks.prisma.guestTag.count.mockResolvedValue(0);
    mocks.prisma.weddingSection.findMany.mockResolvedValue([sections[0]]);
    mocks.prisma.guestSectionAssignment.createMany.mockRejectedValue(
      new Error("assignment write failed"),
    );

    await expect(
      guestRepository.createGuestWithPlusOne(weddingId, {
        primary: guestInput,
        plusOne: plusOneInput,
        primaryTagIds: [],
        plusOneSectionIds: [sections[0].id],
      }),
    ).rejects.toThrow("Unable to create guest");
    expect(mocks.prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: "Serializable" },
    );
    expect(mocks.prisma.guest.findFirst).not.toHaveBeenCalled();
  });

  it("adds a new plus-one with selected sections in the same transaction", async () => {
    mocks.prisma.guest.findFirst
      .mockResolvedValueOnce({
        id: "guest_parent",
        householdId: null,
        plusOneForGuestId: null,
        plusOnes: [],
      })
      .mockResolvedValueOnce(guestDetail());
    mocks.prisma.weddingSection.findMany.mockResolvedValue([sections[1]]);

    await guestRepository.addPlusOne(
      weddingId,
      "guest_parent",
      plusOneInput,
      ["section_venue"],
    );

    const plusOneId = mocks.prisma.guest.create.mock.calls[0][0].data.id;
    expect(mocks.prisma.guestSectionAssignment.createMany).toHaveBeenCalledWith({
      data: [{ guestId: plusOneId, sectionId: "section_venue" }],
    });
  });

  it("preserves an existing inactive assignment when editing a guest", async () => {
    mocks.prisma.guest.findFirst
      .mockResolvedValueOnce({ id: "guest_1" })
      .mockResolvedValueOnce({
        id: "guest_1",
        householdId: null,
        plusOneForGuestId: null,
        plusOneFor: null,
        plusOnes: [],
      })
      .mockResolvedValueOnce(guestDetail());
    mocks.prisma.guestSectionAssignment.findMany.mockResolvedValue([
      { sectionId: "section_inactive" },
    ]);
    mocks.prisma.weddingSection.findMany.mockResolvedValue([
      { id: "section_inactive", active: false },
    ]);

    await guestRepository.updateGuest(
      weddingId,
      "guest_1",
      guestInput,
      [],
      ["section_inactive"],
    );

    expect(mocks.prisma.guestSectionAssignment.createMany).toHaveBeenCalledWith({
      data: [{ guestId: "guest_1", sectionId: "section_inactive" }],
    });
    expect(mocks.prisma.guest.update).toHaveBeenCalled();
  });

  it("keeps guest field and assignment updates in one transaction on failure", async () => {
    mocks.prisma.guest.findFirst
      .mockResolvedValueOnce({ id: "guest_1" })
      .mockResolvedValueOnce({
        id: "guest_1",
        householdId: null,
        plusOneForGuestId: null,
        plusOneFor: null,
        plusOnes: [],
      });
    mocks.prisma.weddingSection.findMany.mockResolvedValue([sections[0]]);
    mocks.prisma.guestSectionAssignment.createMany.mockRejectedValue(
      new Error("assignment write failed"),
    );

    await expect(
      guestRepository.updateGuest(
        weddingId,
        "guest_1",
        guestInput,
        [],
        ["section_ceremony"],
      ),
    ).rejects.toThrow("Unable to update guest");
    expect(mocks.prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: "Serializable" },
    );
    expect(mocks.prisma.guest.update).not.toHaveBeenCalled();
  });
});
