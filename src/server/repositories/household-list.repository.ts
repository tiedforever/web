import "server-only";

import { Prisma } from "../../../app/generated/prisma/client";
import { prisma } from "../db/prisma";
import { logger } from "../logging/logger";

export type HouseholdListTag = {
  id: string;
  name: string;
};

export type HouseholdListItem = {
  id: string;
  name: string;
  addressLineOne: string;
  townCity: string;
  postcode: string;
  primaryGuest: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  guestCount: number;
};

export type HouseholdListData = {
  households: HouseholdListItem[];
  tags: HouseholdListTag[];
};

const householdListSelect = {
  id: true,
  name: true,
  addressLineOne: true,
  townCity: true,
  postcode: true,
  primaryGuest: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  _count: {
    select: {
      guests: true,
    },
  },
} satisfies Prisma.HouseholdSelect;

const householdListTagSelect = {
  id: true,
  name: true,
} satisfies Prisma.GuestTagSelect;

type HouseholdRecord = Prisma.HouseholdGetPayload<{
  select: typeof householdListSelect;
}>;

export class HouseholdListRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HouseholdListRepositoryError";
  }
}

export class HouseholdListRepository {
  async getHouseholdList(
    weddingId: string,
    options: { includeTags?: boolean } = {},
  ): Promise<HouseholdListData> {
    const households = await this.listHouseholds(weddingId);
    const tags = options.includeTags ? await this.listTags(weddingId) : [];

    return { households, tags };
  }

  private async listHouseholds(
    weddingId: string,
  ): Promise<HouseholdListItem[]> {
    try {
      const households = await prisma.household.findMany({
        where: { weddingId },
        select: householdListSelect,
        orderBy: [{ name: "asc" }],
      });

      return households.map((household) => this.mapHousehold(household));
    } catch (error) {
      logger.error(
        "[household-list-repository] list households failed",
        error,
      );
      throw new HouseholdListRepositoryError("Unable to load households");
    }
  }

  private async listTags(weddingId: string): Promise<HouseholdListTag[]> {
    try {
      return await prisma.guestTag.findMany({
        where: { weddingId },
        orderBy: [{ name: "asc" }],
        select: householdListTagSelect,
      });
    } catch (error) {
      logger.error(
        "[household-list-repository] list guest tags failed",
        error,
      );
      throw new HouseholdListRepositoryError("Unable to load guest tags");
    }
  }

  private mapHousehold(household: HouseholdRecord): HouseholdListItem {
    return {
      id: household.id,
      name: household.name,
      addressLineOne: household.addressLineOne,
      townCity: household.townCity,
      postcode: household.postcode,
      primaryGuest: household.primaryGuest,
      guestCount: household._count.guests,
    };
  }
}

export const householdListRepository = new HouseholdListRepository();
