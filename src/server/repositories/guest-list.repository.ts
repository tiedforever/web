import "server-only";

import {
  GuestAgeGroup,
  Prisma,
} from "../../../app/generated/prisma/client";
import { prisma } from "../db/prisma";
import { logger } from "../logging/logger";
import {
  firstError,
  guestAgeGroups,
  parseEnum,
  parseId,
  parseOptionalText,
  parsedValue,
} from "../actions/guests/validation";

export type GuestListTag = {
  id: string;
  name: string;
};

export type GuestListSection = {
  id: string;
  name: string;
  active: boolean;
};

export type GuestListName = {
  id: string;
  firstName: string;
  lastName: string;
};

export type GuestListPlusOne = {
  id: string;
  title: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  ageGroup: GuestAgeGroup;
  tags: GuestListTag[];
  sections: GuestListSection[];
  plusOneFor?: GuestListName | null;
};

export type GuestListStandaloneGuest = {
  id: string;
  title: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  ageGroup: GuestAgeGroup;
  tags: GuestListTag[];
  sections: GuestListSection[];
  plusOneFor: null;
  plusOnes: GuestListPlusOne[];
};

export type GuestListHouseholdGuest = {
  id: string;
  title: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  ageGroup: GuestAgeGroup;
  tags: GuestListTag[];
  sections: GuestListSection[];
  plusOneFor: GuestListName | null;
  plusOnes: { id: string }[];
};

export type GuestListHousehold = {
  id: string;
  name: string;
  addressLineOne: string;
  townCity: string;
  primaryGuestId: string | null;
  primaryGuest: GuestListName | null;
  guests: GuestListHouseholdGuest[];
};

export type GuestListData = {
  standaloneGuests: GuestListStandaloneGuest[];
  households: GuestListHousehold[];
  tags: GuestListTag[];
};

export type GuestListFilters = {
  search?: string;
  ageGroup?: GuestAgeGroup;
  tagId?: string;
  sectionId?: string;
};

export type GuestListFiltersInput = {
  search?: unknown;
  ageGroup?: unknown;
  tagId?: unknown;
  sectionId?: unknown;
};

export type GuestListFilterResult =
  | { value: GuestListFilters }
  | { error: string };

const guestListTagSelect = {
  id: true,
  name: true,
} satisfies Prisma.GuestTagSelect;

const standaloneGuestSelect = {
  id: true,
  title: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  ageGroup: true,
  sectionAssignments: {
    select: {
      section: {
        select: {
          id: true,
          name: true,
          active: true,
        },
      },
    },
    orderBy: { section: { position: "asc" } },
  },
  tagAssignments: {
    select: {
      tag: { select: guestListTagSelect },
    },
    orderBy: { tag: { name: "asc" } },
  },
  plusOnes: {
    select: {
      id: true,
      title: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      ageGroup: true,
      sectionAssignments: {
        select: {
          section: {
            select: {
              id: true,
              name: true,
              active: true,
            },
          },
        },
        orderBy: { section: { position: "asc" } },
      },
      tagAssignments: {
        select: {
          tag: { select: guestListTagSelect },
        },
        orderBy: { tag: { name: "asc" } },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  },
} satisfies Prisma.GuestSelect;

const householdSelect = {
  id: true,
  name: true,
  addressLineOne: true,
  townCity: true,
  primaryGuestId: true,
  primaryGuest: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  guests: {
    select: {
      id: true,
      title: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      ageGroup: true,
      sectionAssignments: {
        select: {
          section: {
            select: {
              id: true,
              name: true,
              active: true,
            },
          },
        },
        orderBy: { section: { position: "asc" } },
      },
      tagAssignments: {
        select: {
          tag: { select: guestListTagSelect },
        },
        orderBy: { tag: { name: "asc" } },
      },
      plusOneFor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      plusOnes: {
        select: { id: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  },
} satisfies Prisma.HouseholdSelect;

type StandaloneGuestRecord = Prisma.GuestGetPayload<{
  select: typeof standaloneGuestSelect;
}>;

type HouseholdRecord = Prisma.HouseholdGetPayload<{
  select: typeof householdSelect;
}>;

export class GuestListRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuestListRepositoryError";
  }
}

export function parseGuestListFilters(
  input: GuestListFiltersInput = {},
): GuestListFilterResult {
  const search = parseOptionalText(input.search, "Search", 100);
  const tagId =
    input.tagId === undefined || input.tagId === ""
      ? { value: undefined }
      : parseId(input.tagId, "Tag");
  const ageGroup =
    input.ageGroup === undefined || input.ageGroup === ""
      ? { value: undefined }
      : parseEnum(input.ageGroup, "Age group", guestAgeGroups);
  const sectionId =
    input.sectionId === undefined || input.sectionId === ""
      ? { value: undefined }
      : parseId(input.sectionId, "Wedding section");
  const error = firstError(
    search,
    tagId,
    ageGroup,
    sectionId,
  );

  if (error) return { error };

  return {
    value: {
      search: parsedValue(search) ?? undefined,
      ageGroup: parsedValue(ageGroup),
      tagId: parsedValue(tagId),
      sectionId: parsedValue(sectionId),
    },
  };
}

function buildStandaloneGuestWhere(
  weddingId: string,
  filters: GuestListFilters = {},
): Prisma.GuestWhereInput {
  const search = filters.search?.trim();
  const and: Prisma.GuestWhereInput[] = [];

  if (filters.ageGroup) {
    and.push({
      OR: [
        { ageGroup: filters.ageGroup },
        { plusOnes: { some: { ageGroup: filters.ageGroup } } },
      ],
    });
  }

  if (filters.tagId) {
    and.push({
      OR: [
        { tagAssignments: { some: { tagId: filters.tagId } } },
        {
          plusOnes: {
            some: { tagAssignments: { some: { tagId: filters.tagId } } },
          },
        },
      ],
    });
  }

  if (filters.sectionId) {
    and.push({
      OR: [
        {
          sectionAssignments: {
            some: {
              sectionId: filters.sectionId,
              section: { weddingId },
            },
          },
        },
        {
          plusOnes: {
            some: {
              sectionAssignments: {
                some: {
                  sectionId: filters.sectionId,
                  section: { weddingId },
                },
              },
            },
          },
        },
      ],
    });
  }

  return {
    weddingId,
    plusOneForGuestId: null,
    householdId: null,
    AND: and,
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            {
              household: {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { addressLineOne: { contains: search, mode: "insensitive" } },
                  { addressLineTwo: { contains: search, mode: "insensitive" } },
                  { townCity: { contains: search, mode: "insensitive" } },
                  { countyRegion: { contains: search, mode: "insensitive" } },
                  { postcode: { contains: search, mode: "insensitive" } },
                  { country: { contains: search, mode: "insensitive" } },
                ],
              },
            },
            {
              plusOnes: {
                some: {
                  OR: [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { phone: { contains: search, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };
}

function buildHouseholdSectionGuestWhere(
  weddingId: string,
  sectionId: string,
): Prisma.GuestWhereInput {
  const assignment = {
    sectionAssignments: {
      some: {
        sectionId,
        section: { weddingId },
      },
    },
  } satisfies Prisma.GuestWhereInput;

  return {
    OR: [
      assignment,
      { plusOneFor: assignment },
      { plusOnes: { some: assignment } },
    ],
  };
}

function buildHouseholdWhere(
  weddingId: string,
  filters: GuestListFilters = {},
): Prisma.HouseholdWhereInput {
  const search = filters.search?.trim();
  const and: Prisma.HouseholdWhereInput[] = [];

  if (search) {
    and.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { addressLineOne: { contains: search, mode: "insensitive" } },
        { addressLineTwo: { contains: search, mode: "insensitive" } },
        { townCity: { contains: search, mode: "insensitive" } },
        { countyRegion: { contains: search, mode: "insensitive" } },
        { postcode: { contains: search, mode: "insensitive" } },
        { country: { contains: search, mode: "insensitive" } },
        {
          primaryGuest: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
            ],
          },
        },
        {
          guests: {
            some: {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
                {
                  plusOnes: {
                    some: {
                      OR: [
                        { firstName: { contains: search, mode: "insensitive" } },
                        { lastName: { contains: search, mode: "insensitive" } },
                        { email: { contains: search, mode: "insensitive" } },
                        { phone: { contains: search, mode: "insensitive" } },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    });
  }

  if (filters.ageGroup) {
    and.push({ guests: { some: { ageGroup: filters.ageGroup } } });
  }

  if (filters.tagId) {
    and.push({
      guests: {
        some: { tagAssignments: { some: { tagId: filters.tagId } } },
      },
    });
  }

  if (filters.sectionId) {
    and.push({
      guests: {
        some: buildHouseholdSectionGuestWhere(weddingId, filters.sectionId),
      },
    });
  }

  return {
    weddingId,
    AND: and,
  };
}

function mapTags(
  assignments: Array<{ tag: GuestListTag }>,
): GuestListTag[] {
  return assignments.map(({ tag }) => tag);
}

function mapSections(
  assignments: Array<{ section: GuestListSection }>,
): GuestListSection[] {
  return assignments.map(({ section }) => section);
}

function mapStandaloneGuest(guest: StandaloneGuestRecord): GuestListStandaloneGuest {
  return {
    id: guest.id,
    title: guest.title,
    firstName: guest.firstName,
    lastName: guest.lastName,
    email: guest.email,
    phone: guest.phone,
    ageGroup: guest.ageGroup,
    tags: mapTags(guest.tagAssignments),
    sections: mapSections(guest.sectionAssignments),
    plusOneFor: null,
    plusOnes: guest.plusOnes.map((plusOne) => ({
      id: plusOne.id,
      title: plusOne.title,
      firstName: plusOne.firstName,
      lastName: plusOne.lastName,
      email: plusOne.email,
      phone: plusOne.phone,
      ageGroup: plusOne.ageGroup,
      tags: mapTags(plusOne.tagAssignments),
      sections: mapSections(plusOne.sectionAssignments),
    })),
  };
}

function mapHousehold(household: HouseholdRecord): GuestListHousehold {
  return {
    id: household.id,
    name: household.name,
    addressLineOne: household.addressLineOne,
    townCity: household.townCity,
    primaryGuestId: household.primaryGuestId,
    primaryGuest: household.primaryGuest,
    guests: household.guests.map((guest) => ({
      id: guest.id,
      title: guest.title,
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
      phone: guest.phone,
      ageGroup: guest.ageGroup,
      tags: mapTags(guest.tagAssignments),
      sections: mapSections(guest.sectionAssignments),
      plusOneFor: guest.plusOneFor,
      plusOnes: guest.plusOnes,
    })),
  };
}

export class GuestListRepository {
  async getGuestList(
    weddingId: string,
    filters: GuestListFilters = {},
  ): Promise<GuestListData> {
    const [standaloneGuests, households, tags] = await Promise.all([
      this.listStandaloneGuests(weddingId, filters),
      this.listHouseholds(weddingId, filters),
      this.listTags(weddingId),
    ]);

    return { standaloneGuests, households, tags };
  }

  private async listStandaloneGuests(
    weddingId: string,
    filters: GuestListFilters,
  ): Promise<GuestListStandaloneGuest[]> {
    try {
      const guests = await prisma.guest.findMany({
        where: buildStandaloneGuestWhere(weddingId, filters),
        select: standaloneGuestSelect,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });

      return guests.map(mapStandaloneGuest);
    } catch (error) {
      logger.error("[guest-list-repository] list standalone guests failed", error);
      throw new GuestListRepositoryError("Unable to load standalone guests");
    }
  }

  private async listHouseholds(
    weddingId: string,
    filters: GuestListFilters,
  ): Promise<GuestListHousehold[]> {
    try {
      const households = await prisma.household.findMany({
        where: buildHouseholdWhere(weddingId, filters),
        select: filters.sectionId
          ? {
              ...householdSelect,
              guests: {
                ...householdSelect.guests,
                where: buildHouseholdSectionGuestWhere(weddingId, filters.sectionId),
              },
            }
          : householdSelect,
        orderBy: [{ name: "asc" }],
      });

      return households.map(mapHousehold);
    } catch (error) {
      logger.error("[guest-list-repository] list households failed", error);
      throw new GuestListRepositoryError("Unable to load households");
    }
  }

  private async listTags(weddingId: string): Promise<GuestListTag[]> {
    try {
      return await prisma.guestTag.findMany({
        where: { weddingId },
        orderBy: [{ name: "asc" }],
        select: guestListTagSelect,
      });
    } catch (error) {
      logger.error("[guest-list-repository] list guest tags failed", error);
      throw new GuestListRepositoryError("Unable to load guest tags");
    }
  }
}

export const guestListRepository = new GuestListRepository();
