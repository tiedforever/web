import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    guest: { findMany: vi.fn() },
    household: { findMany: vi.fn() },
    guestTag: { findMany: vi.fn() },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("../src/server/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("../src/server/logging/logger", () => ({
  logger: { error: vi.fn() },
}));

import {
  guestListRepository,
  parseGuestListFilters,
} from "../src/server/repositories/guest-list.repository";

const weddingId = "wedding_1";

function standaloneGuestRecord() {
  return {
    id: "guest_1",
    title: "Mx",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    phone: "0123456789",
    ageGroup: "ADULT",
    sectionAssignments: [{ section: { id: "section_1", name: "Ceremony", active: true } }],
    tagAssignments: [{ tag: { id: "tag_1", name: "VIP" } }],
    plusOnes: [
      {
        id: "guest_2",
        title: null,
        firstName: "Charles",
        lastName: "Babbage",
        email: "charles@example.com",
        phone: null,
        ageGroup: "ADULT",
        sectionAssignments: [{ section: { id: "section_2", name: "Venue", active: true } }],
        tagAssignments: [{ tag: { id: "tag_2", name: "Family" } }],
      },
    ],
  };
}

function householdRecord() {
  return {
    id: "household_1",
    name: "Lovelace household",
    addressLineOne: "1 Analytical Engine Lane",
    townCity: "London",
    primaryGuestId: "guest_3",
    primaryGuest: {
      id: "guest_3",
      firstName: "Grace",
      lastName: "Hopper",
    },
    guests: [
      {
        id: "guest_3",
        title: null,
        firstName: "Grace",
        lastName: "Hopper",
        email: "grace@example.com",
        phone: null,
        ageGroup: "ADULT",
        sectionAssignments: [],
        tagAssignments: [{ tag: { id: "tag_1", name: "VIP" } }],
        plusOneFor: null,
        plusOnes: [{ id: "guest_4" }],
      },
      {
        id: "guest_4",
        title: null,
        firstName: "Katherine",
        lastName: "Johnson",
        email: null,
        phone: null,
        ageGroup: "ADULT",
        sectionAssignments: [{ section: { id: "section_2", name: "Venue", active: true } }],
        tagAssignments: [],
        plusOneFor: {
          id: "guest_3",
          firstName: "Grace",
          lastName: "Hopper",
        },
        plusOnes: [],
      },
    ],
  };
}

describe("guestListRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.guest.findMany.mockResolvedValue([standaloneGuestRecord()]);
    mocks.prisma.household.findMany.mockResolvedValue([householdRecord()]);
    mocks.prisma.guestTag.findMany.mockResolvedValue([
      { id: "tag_1", name: "VIP" },
    ]);
  });

  it("loads wedding-scoped list reads concurrently and preserves the list shape", async () => {
    const order: string[] = [];
    mocks.prisma.guest.findMany.mockImplementation(async () => {
      order.push("guests");
      return [standaloneGuestRecord()];
    });
    mocks.prisma.household.findMany.mockImplementation(async () => {
      order.push("households");
      return [householdRecord()];
    });
    mocks.prisma.guestTag.findMany.mockImplementation(async () => {
      order.push("tags");
      return [{ id: "tag_1", name: "VIP" }];
    });

    const result = await guestListRepository.getGuestList(weddingId);

    expect(order).toEqual(["guests", "households", "tags"]);
    expect(result.standaloneGuests[0]).toMatchObject({
      id: "guest_1",
      firstName: "Ada",
      tags: [{ id: "tag_1", name: "VIP" }],
      sections: [{ id: "section_1", name: "Ceremony", active: true }],
      plusOnes: [{
        id: "guest_2",
        firstName: "Charles",
        sections: [{ id: "section_2", name: "Venue", active: true }],
      }],
    });
    expect(result.households[0]).toMatchObject({
      id: "household_1",
      name: "Lovelace household",
      addressLineOne: "1 Analytical Engine Lane",
      townCity: "London",
      primaryGuest: { id: "guest_3", firstName: "Grace", lastName: "Hopper" },
    });
    expect(result.households[0]?.guests[0]).toMatchObject({
      id: "guest_3",
      plusOnes: [{ id: "guest_4" }],
    });
    expect(result.households[0]?.guests[1]).toMatchObject({
      id: "guest_4",
      sections: [{ id: "section_2", name: "Venue", active: true }],
    });
    expect(result.tags).toEqual([{ id: "tag_1", name: "VIP" }]);

    expect(mocks.prisma.guest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ weddingId }) }),
    );
    expect(mocks.prisma.household.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ weddingId }) }),
    );
    expect(mocks.prisma.guestTag.findMany).toHaveBeenCalledWith({
      where: { weddingId },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true },
    });
  });

  it("starts all independent list reads before any one read resolves", async () => {
    const started: string[] = [];
    let resolveGuests!: (value: unknown[]) => void;
    let resolveHouseholds!: (value: unknown[]) => void;
    let resolveTags!: (value: unknown[]) => void;

    const guests = new Promise<unknown[]>((resolve) => { resolveGuests = resolve; });
    const households = new Promise<unknown[]>((resolve) => { resolveHouseholds = resolve; });
    const tags = new Promise<unknown[]>((resolve) => { resolveTags = resolve; });

    mocks.prisma.guest.findMany.mockImplementation(() => {
      started.push("guests");
      return guests;
    });
    mocks.prisma.household.findMany.mockImplementation(() => {
      started.push("households");
      return households;
    });
    mocks.prisma.guestTag.findMany.mockImplementation(() => {
      started.push("tags");
      return tags;
    });

    const resultPromise = guestListRepository.getGuestList(weddingId);
    await Promise.resolve();

    expect(started).toEqual(["guests", "households", "tags"]);

    resolveGuests([standaloneGuestRecord()]);
    resolveHouseholds([householdRecord()]);
    resolveTags([{ id: "tag_1", name: "VIP" }]);

    await expect(resultPromise).resolves.toMatchObject({
      standaloneGuests: [expect.objectContaining({ id: "guest_1" })],
      households: [expect.objectContaining({ id: "household_1" })],
      tags: [{ id: "tag_1", name: "VIP" }],
    });
  });

  it("preserves standalone scoping, filters, and sorting without detail fields", async () => {
    const parsed = parseGuestListFilters({
      search: "Ada",
      ageGroup: "CHILD",
      tagId: "11111111-1111-4111-8111-111111111111",
      sectionId: "11111111-1111-4111-8111-111111111112",
    });

    expect(parsed).toEqual({
      value: {
        search: "Ada",
        ageGroup: "CHILD",
        tagId: "11111111-1111-4111-8111-111111111111",
        sectionId: "11111111-1111-4111-8111-111111111112",
      },
    });
    if ("error" in parsed) throw new Error(parsed.error);

    await guestListRepository.getGuestList(weddingId, parsed.value);

    const args = mocks.prisma.guest.findMany.mock.calls[0][0];
    expect(args.where).toEqual(expect.objectContaining({
      weddingId,
      plusOneForGuestId: null,
      householdId: null,
    }));
    expect(args.where.AND).toEqual(expect.arrayContaining([
      {
        OR: [
          { ageGroup: "CHILD" },
          { plusOnes: { some: { ageGroup: "CHILD" } } },
        ],
      },
      {
        OR: [
          {
            sectionAssignments: {
              some: {
                sectionId: "11111111-1111-4111-8111-111111111112",
                section: { weddingId },
              },
            },
          },
          {
            plusOnes: {
              some: {
                sectionAssignments: {
                  some: {
                    sectionId: "11111111-1111-4111-8111-111111111112",
                    section: { weddingId },
                  },
                },
              },
            },
          },
        ],
      },
      {
        OR: [
          { tagAssignments: { some: { tagId: "11111111-1111-4111-8111-111111111111" } } },
          {
            plusOnes: {
              some: {
                tagAssignments: {
                  some: { tagId: "11111111-1111-4111-8111-111111111111" },
                },
              },
            },
          },
        ],
      },
    ]));
    expect(args.orderBy).toEqual([{ lastName: "asc" }, { firstName: "asc" }]);
    expect(args.include).toBeUndefined();
    expect(args.select).toEqual(expect.objectContaining({
      id: true,
      title: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      ageGroup: true,
      tagAssignments: expect.any(Object),
      plusOnes: expect.any(Object),
    }));
    expect(args.select).not.toHaveProperty("household");
    expect(args.select).not.toHaveProperty("dietaryRequirements");
    expect(args.select).not.toHaveProperty("notes");
    expect(args.select).not.toHaveProperty("createdAt");
    expect(args.select).not.toHaveProperty("updatedAt");
    expect(args.select.plusOnes.select).not.toHaveProperty("dietaryRequirements");
    expect(args.select.plusOnes.select).not.toHaveProperty("notes");
    expect(mocks.prisma.household.findMany).toHaveBeenCalled();
  });

  it("selects only the household fields needed for grouping and rendering", async () => {
    await guestListRepository.getGuestList(weddingId);

    const args = mocks.prisma.household.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ weddingId, AND: [] });
    expect(args.orderBy).toEqual([{ name: "asc" }]);
    expect(args.include).toBeUndefined();
    expect(args.select).toEqual(expect.objectContaining({
      id: true,
      name: true,
      addressLineOne: true,
      townCity: true,
      primaryGuestId: true,
      primaryGuest: expect.any(Object),
      guests: expect.any(Object),
    }));
    expect(args.select).not.toHaveProperty("weddingId");
    expect(args.select).not.toHaveProperty("addressLineTwo");
    expect(args.select).not.toHaveProperty("countyRegion");
    expect(args.select).not.toHaveProperty("postcode");
    expect(args.select).not.toHaveProperty("country");
    expect(args.select).not.toHaveProperty("notes");
    expect(args.select.guests.select).not.toHaveProperty("dietaryRequirements");
    expect(args.select.guests.select).not.toHaveProperty("notes");
    expect(args.select.guests.select.plusOnes.select).toEqual({ id: true });
    expect(args.select.guests.orderBy).toEqual([
      { lastName: "asc" },
      { firstName: "asc" },
    ]);
  });

  it("keeps section filters, search, and tags wedding-scoped", async () => {
    await guestListRepository.getGuestList(weddingId, {
      search: "London",
      ageGroup: "ADULT",
      tagId: "tag_1",
      sectionId: "section_1",
    });

    expect(mocks.prisma.household.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ weddingId }),
      }),
    );
    expect(mocks.prisma.guestTag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { weddingId } }),
    );
  });

  it("rejects invalid list filters before querying", () => {
    expect(parseGuestListFilters({ ageGroup: "UNKNOWN" })).toEqual({
      error: "Age group is invalid",
    });
    expect(parseGuestListFilters({ sectionId: "not-an-id" })).toEqual({
      error: "Wedding section is invalid",
    });
  });
});
