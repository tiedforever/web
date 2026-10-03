import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    household: { findMany: vi.fn() },
    guestTag: { findMany: vi.fn() },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("../src/server/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("../src/server/logging/logger", () => ({
  logger: { error: vi.fn() },
}));

import { householdListRepository } from "../src/server/repositories/household-list.repository";

const weddingId = "wedding_1";

function householdRecord() {
  return {
    id: "household_1",
    name: "Lovelace household",
    addressLineOne: "1 Analytical Engine Lane",
    townCity: "London",
    postcode: "W1A 1AA",
    primaryGuest: {
      id: "guest_1",
      firstName: "Ada",
      lastName: "Lovelace",
    },
    _count: { guests: 3 },
  };
}

describe("householdListRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.household.findMany.mockResolvedValue([householdRecord()]);
    mocks.prisma.guestTag.findMany.mockResolvedValue([
      { id: "tag_1", name: "VIP" },
    ]);
  });

  it("loads wedding-scoped households in name order and maps guest counts", async () => {
    const result = await householdListRepository.getHouseholdList(weddingId, {
      includeTags: true,
    });

    expect(result.households).toEqual([
      {
        id: "household_1",
        name: "Lovelace household",
        addressLineOne: "1 Analytical Engine Lane",
        townCity: "London",
        postcode: "W1A 1AA",
        primaryGuest: {
          id: "guest_1",
          firstName: "Ada",
          lastName: "Lovelace",
        },
        guestCount: 3,
      },
    ]);

    expect(mocks.prisma.household.findMany).toHaveBeenCalledWith({
      where: { weddingId },
      select: expect.objectContaining({
        id: true,
        name: true,
        addressLineOne: true,
        townCity: true,
        postcode: true,
        primaryGuest: expect.any(Object),
        _count: { select: { guests: true } },
      }),
      orderBy: [{ name: "asc" }],
    });
    expect(mocks.prisma.household.findMany.mock.calls[0][0].include).toBeUndefined();
  });

  it("does not select detail-only fields or guest relation graphs", async () => {
    await householdListRepository.getHouseholdList(weddingId);

    const args = mocks.prisma.household.findMany.mock.calls[0][0];
    expect(args.select).not.toHaveProperty("weddingId");
    expect(args.select).not.toHaveProperty("addressLineTwo");
    expect(args.select).not.toHaveProperty("countyRegion");
    expect(args.select).not.toHaveProperty("country");
    expect(args.select).not.toHaveProperty("notes");
    expect(args.select).not.toHaveProperty("createdAt");
    expect(args.select).not.toHaveProperty("updatedAt");
    expect(args.select).not.toHaveProperty("guests");
    expect(args.select).not.toHaveProperty("plusOneFor");
    expect(args.select).not.toHaveProperty("plusOnes");
  });

  it("scopes guest tags to the wedding and selects only id and name", async () => {
    const result = await householdListRepository.getHouseholdList(weddingId, {
      includeTags: true,
    });

    expect(result.tags).toEqual([{ id: "tag_1", name: "VIP" }]);
    expect(mocks.prisma.guestTag.findMany).toHaveBeenCalledWith({
      where: { weddingId },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true },
    });
  });

  it("skips tag data when the page does not render household creation", async () => {
    const result = await householdListRepository.getHouseholdList(weddingId, {
      includeTags: false,
    });

    expect(result.tags).toEqual([]);
    expect(mocks.prisma.guestTag.findMany).not.toHaveBeenCalled();
  });

  it("does not expose data from another wedding through an unscoped query", async () => {
    await householdListRepository.getHouseholdList("wedding_qa", {
      includeTags: true,
    });

    expect(mocks.prisma.household.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { weddingId: "wedding_qa" } }),
    );
    expect(mocks.prisma.guestTag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { weddingId: "wedding_qa" } }),
    );
  });
});
