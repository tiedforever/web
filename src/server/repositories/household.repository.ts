import "server-only";

import { randomUUID } from "node:crypto";

import {
  GuestAgeGroup,
  Prisma,
} from "../../../app/generated/prisma/client";
import { prisma } from "../db/prisma";
import { logger } from "../logging/logger";

export type HouseholdInput = {
  name: string;
  addressLineOne: string;
  addressLineTwo?: string | null;
  townCity: string;
  countyRegion?: string | null;
  postcode: string;
  country: string;
  notes?: string | null;
};

export type HouseholdGuestInput = {
  title?: string | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  ageGroup: GuestAgeGroup;
  dietaryRequirements?: string | null;
  notes?: string | null;
  tagIds: string[];
};

export type CreateHouseholdWithGuestsInput = {
  household: HouseholdInput;
  guests: HouseholdGuestInput[];
  primaryGuestIndex: number;
};

export type HouseholdFilters = {
  search?: string;
  householdId?: string;
  ageGroup?: GuestAgeGroup;
  tagId?: string;
  unassignedHousehold?: boolean;
};

const householdInclude = {
  primaryGuest: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  guests: {
    include: {
      tagAssignments: { include: { tag: true } },
      plusOneFor: {
        select: { id: true, firstName: true, lastName: true },
      },
      plusOnes: {
        select: { id: true, firstName: true, lastName: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  },
} satisfies Prisma.HouseholdInclude;

const primaryGuestOrder = [
  { lastName: "asc" },
  { firstName: "asc" },
  { id: "asc" },
] satisfies Prisma.GuestOrderByWithRelationInput[];

/**
 * Restore the household primary invariant after a membership change.
 *
 * The first eligible guest in last-name/first-name/ID order is promoted. The
 * ID tie-breaker keeps the result deterministic when names are identical.
 * Plus-ones are deliberately excluded; a household with only a plus-one
 * cannot occur after a valid parent deletion because the self-reference is
 * set to null, making that remaining guest eligible.
 */
export async function ensureHouseholdPrimaryGuest(
  tx: Prisma.TransactionClient,
  weddingId: string,
  householdId: string,
) {
  const household = await tx.household.findFirst({
    where: { id: householdId, weddingId },
    select: { id: true, primaryGuestId: true },
  });

  if (!household) return;

  if (household.primaryGuestId) {
    const currentPrimary = await tx.guest.findFirst({
      where: {
        id: household.primaryGuestId,
        weddingId,
        householdId,
        plusOneForGuestId: null,
      },
      select: { id: true },
    });

    if (currentPrimary) return;
  }

  const replacement = await tx.guest.findFirst({
    where: {
      weddingId,
      householdId,
      plusOneForGuestId: null,
    },
    orderBy: primaryGuestOrder,
    select: { id: true },
  });

  await tx.household.update({
    where: { id: household.id },
    data: { primaryGuestId: replacement?.id ?? null },
  });
}

export class HouseholdRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HouseholdRepositoryError";
  }
}

export class HouseholdRepository {
  private async ensureHouseholdBelongsToWedding(
    householdId: string,
    weddingId: string,
  ) {
    const household = await prisma.household.findFirst({
      where: { id: householdId, weddingId },
      select: { id: true },
    });

    if (!household) {
      throw new HouseholdRepositoryError("Household not found");
    }
  }

  async listHouseholds(weddingId: string, filters: HouseholdFilters = {}) {
    try {
      if (filters.unassignedHousehold) return [];

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

      return await prisma.household.findMany({
        where: {
          weddingId,
          id: filters.householdId,
          AND: and,
        },
        include: householdInclude,
        orderBy: [{ name: "asc" }],
      });
    } catch (error) {
      logger.error("[household-repository] list households failed", error);
      throw new HouseholdRepositoryError("Unable to load households");
    }
  }

  async getHousehold(weddingId: string, householdId: string) {
    try {
      const household = await prisma.household.findFirst({
        where: { id: householdId, weddingId },
        include: householdInclude,
      });

      if (!household) {
        throw new HouseholdRepositoryError("Household not found");
      }

      return household;
    } catch (error) {
      if (error instanceof HouseholdRepositoryError) throw error;
      logger.error("[household-repository] get household failed", error);
      throw new HouseholdRepositoryError("Unable to load household");
    }
  }

  async createHousehold() {
    try {
      throw new HouseholdRepositoryError(
        "A household must be created with at least one guest",
      );
    } catch (error) {
      if (error instanceof HouseholdRepositoryError) throw error;
      logger.error("[household-repository] create household failed", error);
      throw new HouseholdRepositoryError("Unable to create household");
    }
  }

  async createHouseholdWithGuests(
    weddingId: string,
    input: CreateHouseholdWithGuestsInput,
  ) {
    try {
      if (input.guests.length === 0) {
        throw new HouseholdRepositoryError("A household needs at least one guest");
      }

      const primaryGuest = input.guests[input.primaryGuestIndex];
      if (!primaryGuest) {
        throw new HouseholdRepositoryError("The primary invitee is invalid");
      }

      const tagIds = [
        ...new Set(input.guests.flatMap((guest) => guest.tagIds)),
      ];
      const tagCount = await prisma.guestTag.count({
        where: { weddingId, id: { in: tagIds } },
      });

      if (tagCount !== tagIds.length) {
        throw new HouseholdRepositoryError("One or more tags were not found");
      }

      const householdId = randomUUID();
      const guestIds = input.guests.map(() => randomUUID());
      const primaryGuestId = guestIds[input.primaryGuestIndex];

      await prisma.$transaction([
        prisma.household.create({
          data: {
            id: householdId,
            weddingId,
            ...input.household,
            primaryGuestId: null,
          },
        }),
        ...input.guests.map((guest, index) =>
          prisma.guest.create({
            data: {
              id: guestIds[index],
              weddingId,
              householdId,
              title: guest.title ?? null,
              firstName: guest.firstName,
              lastName: guest.lastName,
              email: guest.email ?? null,
              phone: guest.phone ?? null,
              ageGroup: guest.ageGroup,
              dietaryRequirements: guest.dietaryRequirements ?? null,
              notes: guest.notes ?? null,
            },
          }),
        ),
        ...input.guests.flatMap((guest, index) =>
          guest.tagIds.map((tagId) =>
            prisma.guestTagAssignment.create({
              data: { guestId: guestIds[index], tagId },
            }),
          ),
        ),
        prisma.household.update({
          where: { id: householdId },
          data: { primaryGuestId },
        }),
      ]);

      return this.getHousehold(weddingId, householdId);
    } catch (error) {
      if (error instanceof HouseholdRepositoryError) throw error;
      logger.error(
        "[household-repository] create household with guests failed",
        error,
      );
      throw new HouseholdRepositoryError(
        "Unable to create household and guests",
      );
    }
  }

  async updateHousehold(
    weddingId: string,
    householdId: string,
    input: HouseholdInput,
  ) {
    try {
      await this.ensureHouseholdBelongsToWedding(householdId, weddingId);
      return await prisma.household.update({
        where: { id: householdId },
        data: input,
        include: householdInclude,
      });
    } catch (error) {
      if (error instanceof HouseholdRepositoryError) throw error;
      logger.error("[household-repository] update household failed", error);
      throw new HouseholdRepositoryError("Unable to update household");
    }
  }

  async deleteHousehold(weddingId: string, householdId: string) {
    try {
      await this.ensureHouseholdBelongsToWedding(householdId, weddingId);
      await prisma.$transaction([
        prisma.guest.updateMany({
          where: { weddingId, householdId },
          data: { householdId: null },
        }),
        prisma.household.delete({ where: { id: householdId } }),
      ]);
    } catch (error) {
      if (error instanceof HouseholdRepositoryError) throw error;
      logger.error("[household-repository] delete household failed", error);
      throw new HouseholdRepositoryError("Unable to delete household");
    }
  }

  async setPrimaryGuest(
    weddingId: string,
    householdId: string,
    guestId: string | null,
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        const household = await tx.household.findFirst({
          where: { id: householdId, weddingId },
          select: { id: true },
        });

        if (!household) {
          throw new HouseholdRepositoryError("Household not found");
        }

        const guestCount = await tx.guest.count({
          where: { weddingId, householdId },
        });

        if (!guestId) {
          if (guestCount > 0) {
            throw new HouseholdRepositoryError(
              "A household with guests must have a primary invitee",
            );
          }

          return tx.household.update({
            where: { id: householdId },
            data: { primaryGuestId: null },
            include: householdInclude,
          });
        }

        const guest = await tx.guest.findFirst({
          where: { id: guestId, weddingId, householdId },
          select: { id: true, plusOneForGuestId: true },
        });

        if (!guest) {
          throw new HouseholdRepositoryError(
            "The primary invitee must belong to this household",
          );
        }

        if (guest.plusOneForGuestId) {
          throw new HouseholdRepositoryError(
            "A plus-one cannot be the primary invitee",
          );
        }

        return tx.household.update({
          where: { id: householdId },
          data: { primaryGuestId: guest.id },
          include: householdInclude,
        });
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      if (error instanceof HouseholdRepositoryError) throw error;
      logger.error("[household-repository] set primary guest failed", error);
      throw new HouseholdRepositoryError("Unable to update primary invitee");
    }
  }

  async addGuestsToHousehold(
    weddingId: string,
    householdId: string,
    guestIds: string[],
  ) {
    try {
      const uniqueGuestIds = [...new Set(guestIds)];
      await prisma.$transaction(async (tx) => {
        const household = await tx.household.findFirst({
          where: { id: householdId, weddingId },
          select: { id: true },
        });

        if (!household) {
          throw new HouseholdRepositoryError("Household not found");
        }

        const guests = await tx.guest.findMany({
          where: { id: { in: uniqueGuestIds }, weddingId },
          select: {
            id: true,
            householdId: true,
            plusOneForGuestId: true,
            plusOneFor: {
              select: { id: true, householdId: true, weddingId: true },
            },
            plusOnes: {
              select: { id: true, householdId: true, weddingId: true },
            },
          },
        });

        if (guests.length !== uniqueGuestIds.length) {
          throw new HouseholdRepositoryError("One or more guests were not found");
        }

        const guestIdsToMove = new Set(uniqueGuestIds);
        for (const guest of guests) {
          if (guest.plusOneForGuestId) {
            if (guest.plusOneFor?.householdId !== householdId) {
              throw new HouseholdRepositoryError(
                "Move the primary guest with this plus-one to keep them together",
              );
            }
          }

          if (guest.plusOnes.length > 0) {
            for (const plusOne of guest.plusOnes) {
              if (plusOne.weddingId !== weddingId) {
                throw new HouseholdRepositoryError(
                  "The plus-one must belong to this wedding",
                );
              }
              guestIdsToMove.add(plusOne.id);
            }
          }
        }

        const expandedGuests = await tx.guest.findMany({
          where: { id: { in: [...guestIdsToMove] }, weddingId },
          select: { id: true, householdId: true },
        });

        const previousHouseholdIds = [
          ...new Set(
            expandedGuests
              .map((guest) => guest.householdId)
              .filter((id): id is string => Boolean(id) && id !== householdId),
          ),
        ];

        if (previousHouseholdIds.length > 0) {
          await tx.household.updateMany({
            where: {
              weddingId,
              primaryGuestId: { in: [...guestIdsToMove] },
            },
            data: { primaryGuestId: null },
          });
        }

        await tx.guest.updateMany({
          where: { id: { in: [...guestIdsToMove] }, weddingId },
          data: { householdId },
        });

        for (const previousHouseholdId of previousHouseholdIds) {
          await ensureHouseholdPrimaryGuest(tx, weddingId, previousHouseholdId);
        }
        await ensureHouseholdPrimaryGuest(tx, weddingId, householdId);
      }, { isolationLevel: "Serializable" });

      return this.getHousehold(weddingId, householdId);
    } catch (error) {
      if (error instanceof HouseholdRepositoryError) throw error;
      logger.error("[household-repository] add guests failed", error);
      throw new HouseholdRepositoryError("Unable to add guests to household");
    }
  }

  async removeGuestsFromHousehold(
    weddingId: string,
    householdId: string,
    guestIds: string[],
  ) {
    try {
      const uniqueGuestIds = [...new Set(guestIds)];
      await prisma.$transaction(async (tx) => {
        const household = await tx.household.findFirst({
          where: { id: householdId, weddingId },
          select: { id: true },
        });

        if (!household) {
          throw new HouseholdRepositoryError("Household not found");
        }

        const guests = await tx.guest.findMany({
          where: { id: { in: uniqueGuestIds }, weddingId, householdId },
          select: {
            id: true,
            plusOneForGuestId: true,
            plusOnes: { select: { id: true, householdId: true } },
          },
        });

        if (guests.length !== uniqueGuestIds.length) {
          throw new HouseholdRepositoryError(
            "One or more guests were not found in this household",
          );
        }

        const guestIdsToRemove = new Set(uniqueGuestIds);
        for (const guest of guests) {
          if (guest.plusOneForGuestId && !guestIdsToRemove.has(guest.plusOneForGuestId)) {
            throw new HouseholdRepositoryError(
              "Remove the primary guest with this plus-one to keep them together",
            );
          }

          for (const plusOne of guest.plusOnes) {
            guestIdsToRemove.add(plusOne.id);
          }
        }

        await tx.household.updateMany({
          where: {
            id: householdId,
            weddingId,
            primaryGuestId: { in: [...guestIdsToRemove] },
          },
          data: { primaryGuestId: null },
        });
        await tx.guest.updateMany({
          where: { id: { in: [...guestIdsToRemove] }, weddingId, householdId },
          data: { householdId: null },
        });

        await ensureHouseholdPrimaryGuest(tx, weddingId, householdId);
      }, { isolationLevel: "Serializable" });

      return this.getHousehold(weddingId, householdId);
    } catch (error) {
      if (error instanceof HouseholdRepositoryError) throw error;
      logger.error("[household-repository] remove guests failed", error);
      throw new HouseholdRepositoryError(
        "Unable to remove guests from household",
      );
    }
  }
}

export const householdRepository = new HouseholdRepository();
