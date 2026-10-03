import "server-only";

import { randomUUID } from "node:crypto";

import {
  GuestAgeGroup,
  Prisma,
} from "../../../app/generated/prisma/client";
import { prisma } from "../db/prisma";
import { logger } from "../logging/logger";
import { ensureHouseholdPrimaryGuest } from "./household.repository";

export type GuestFilters = {
  search?: string;
  householdId?: string;
  ageGroup?: GuestAgeGroup;
  tagId?: string;
  unassignedHousehold?: boolean;
};

export type GuestInput = {
  householdId?: string | null;
  plusOneForGuestId?: string | null;
  title?: string | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  ageGroup: GuestAgeGroup;
  dietaryRequirements?: string | null;
  notes?: string | null;
};

export type CreateGuestWithPlusOneInput = {
  primary: GuestInput;
  plusOne: GuestInput | null;
  primaryTagIds: string[];
  primarySectionIds?: string[];
  plusOneSectionIds?: string[];
};

export type PlusOneInput = Omit<GuestInput, "householdId" | "plusOneForGuestId">;

const guestInclude = {
  household: true,
  plusOneFor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
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
      tagAssignments: {
        include: { tag: true },
        orderBy: { tag: { name: "asc" } },
      },
      sectionAssignments: {
        include: {
          section: {
            select: {
              id: true,
              name: true,
              active: true,
              position: true,
            },
          },
        },
        orderBy: { section: { position: "asc" } },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  },
  tagAssignments: {
    include: { tag: true },
    orderBy: { tag: { name: "asc" } },
  },
  sectionAssignments: {
    include: {
      section: {
        select: {
          id: true,
          name: true,
          active: true,
          position: true,
        },
      },
    },
    orderBy: { section: { position: "asc" } },
  },
} satisfies Prisma.GuestInclude;

type GuestDb = Prisma.TransactionClient | typeof prisma;

export class GuestRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuestRepositoryError";
  }
}

function isPrismaError(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

function throwPlusOneConflict(error: unknown): never | void {
  if (isPrismaError(error, "P2002")) {
    throw new GuestRepositoryError("This guest already has a plus-one.");
  }
  if (isPrismaError(error, "P2034")) {
    throw new GuestRepositoryError(
      "The plus-one relationship changed. Please try again.",
    );
  }
}

export class GuestRepository {
  private async validateSectionIds(
    db: GuestDb,
    weddingId: string,
    sectionIds: string[],
    existingSectionIds: ReadonlySet<string> = new Set(),
  ) {
    const uniqueSectionIds = [...new Set(sectionIds)];
    if (uniqueSectionIds.length === 0) return uniqueSectionIds;

    const sections = await db.weddingSection.findMany({
      where: { id: { in: uniqueSectionIds }, weddingId },
      select: { id: true, active: true },
    });

    if (sections.length !== uniqueSectionIds.length) {
      throw new GuestRepositoryError(
        "One or more wedding sections were not found in this wedding",
      );
    }

    if (sections.some((section) => !section.active && !existingSectionIds.has(section.id))) {
      throw new GuestRepositoryError(
        "Inactive wedding sections cannot be newly assigned",
      );
    }

    return uniqueSectionIds;
  }

  private async replaceGuestSectionAssignments(
    tx: Prisma.TransactionClient,
    guestId: string,
    sectionIds: string[],
  ) {
    await tx.guestSectionAssignment.deleteMany({ where: { guestId } });
    if (sectionIds.length > 0) {
      await tx.guestSectionAssignment.createMany({
        data: sectionIds.map((sectionId) => ({ guestId, sectionId })),
      });
    }
  }

  private buildGuestWhere(
    weddingId: string,
    filters: GuestFilters = {},
    standaloneOnly = false,
  ): Prisma.GuestWhereInput {
    const search = filters.search?.trim();
    const topLevelOnly = standaloneOnly || filters.unassignedHousehold === true;
    const and: Prisma.GuestWhereInput[] = [];

    if (topLevelOnly && filters.ageGroup) {
      and.push({
        OR: [
          { ageGroup: filters.ageGroup },
          { plusOnes: { some: { ageGroup: filters.ageGroup } } },
        ],
      });
    }

    if (topLevelOnly && filters.tagId) {
      and.push({
        OR: [
          { tagAssignments: { some: { tagId: filters.tagId } } },
          { plusOnes: { some: { tagAssignments: { some: { tagId: filters.tagId } } } } },
        ],
      });
    }

    return {
      weddingId,
      plusOneForGuestId: topLevelOnly ? null : undefined,
      householdId:
        topLevelOnly
          ? null
          : filters.householdId || undefined,
      ageGroup: topLevelOnly ? undefined : filters.ageGroup,
      tagAssignments: topLevelOnly
        ? undefined
        : filters.tagId
          ? { some: { tagId: filters.tagId } }
          : undefined,
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

  private async ensureGuestBelongsToWedding(guestId: string, weddingId: string) {
    const guest = await prisma.guest.findFirst({
      where: { id: guestId, weddingId },
      select: { id: true },
    });

    if (!guest) {
      throw new GuestRepositoryError("Guest not found");
    }
  }

  private async validateGuestReferences(
    db: GuestDb,
    weddingId: string,
    input: Pick<GuestInput, "householdId" | "plusOneForGuestId">,
    currentGuestId?: string,
  ) {
    if (input.householdId) {
      const household = await db.household.findFirst({
        where: { id: input.householdId, weddingId },
        select: { id: true },
      });

      if (!household) {
        throw new GuestRepositoryError("Household not found in this wedding");
      }
    }

    if (input.plusOneForGuestId) {
      if (input.plusOneForGuestId === currentGuestId) {
        throw new GuestRepositoryError("A guest cannot be their own plus-one");
      }

      const plusOneTarget = await db.guest.findFirst({
        where: { id: input.plusOneForGuestId, weddingId },
        select: {
          id: true,
          householdId: true,
          plusOneForGuestId: true,
          plusOnes: { select: { id: true } },
        },
      });

      if (!plusOneTarget) {
        throw new GuestRepositoryError(
          "Plus-one target not found in this wedding",
        );
      }

      if (plusOneTarget.plusOneForGuestId) {
        throw new GuestRepositoryError(
          "A plus-one cannot have another plus-one",
        );
      }
      if (plusOneTarget.plusOnes.length > 0) {
        throw new GuestRepositoryError("This guest already has a plus-one");
      }

      if ((input.householdId ?? null) !== plusOneTarget.householdId) {
        throw new GuestRepositoryError(
          "A guest and their plus-one must belong to the same household",
        );
      }
    }
  }

  private async moveGuestWithinTransaction(
    tx: Prisma.TransactionClient,
    weddingId: string,
    guestId: string,
    householdId: string | null,
  ) {
    const currentGuest = await tx.guest.findFirst({
      where: { id: guestId, weddingId },
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

    if (!currentGuest) throw new GuestRepositoryError("Guest not found");
    await this.validateGuestReferences(tx, weddingId, { householdId });

    if (
      currentGuest.plusOneForGuestId &&
      currentGuest.plusOneFor?.householdId !== householdId
    ) {
      throw new GuestRepositoryError(
        "A plus-one must remain in the same household as the guest they belong to",
      );
    }

    if (currentGuest.plusOneFor?.weddingId !== undefined && currentGuest.plusOneFor.weddingId !== weddingId) {
      throw new GuestRepositoryError("The plus-one relationship must stay within this wedding");
    }

    for (const plusOne of currentGuest.plusOnes) {
      if (plusOne.weddingId !== weddingId) {
        throw new GuestRepositoryError("The plus-one relationship must stay within this wedding");
      }
    }

    const relatedGuests = [
      {
        id: currentGuest.id,
        householdId: currentGuest.householdId,
      },
      ...(currentGuest.plusOneForGuestId
        ? []
        : currentGuest.plusOnes.map((plusOne) => ({
            id: plusOne.id,
            householdId: plusOne.householdId,
          }))),
    ];

    const guestsToMove = relatedGuests.filter(
      (guest) => guest.householdId !== householdId,
    );
    const affectedHouseholdIds = new Set<string>();

    for (const guest of guestsToMove) {
      if (guest.householdId) affectedHouseholdIds.add(guest.householdId);
    }
    if (householdId) affectedHouseholdIds.add(householdId);

    if (guestsToMove.length > 0) {
      await tx.household.updateMany({
        where: {
          weddingId,
          primaryGuestId: { in: guestsToMove.map((guest) => guest.id) },
        },
        data: { primaryGuestId: null },
      });

      await tx.guest.updateMany({
        where: {
          weddingId,
          id: { in: guestsToMove.map((guest) => guest.id) },
        },
        data: { householdId },
      });
    }

    for (const affectedHouseholdId of affectedHouseholdIds) {
      await ensureHouseholdPrimaryGuest(
        tx,
        weddingId,
        affectedHouseholdId,
      );
    }
  }

  async listGuests(weddingId: string, filters: GuestFilters = {}) {
    try {
      return await prisma.guest.findMany({
        where: this.buildGuestWhere(weddingId, filters),
        include: guestInclude,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });
    } catch (error) {
      logger.error("[guest-repository] list guests failed", error);
      throw new GuestRepositoryError("Unable to load guests");
    }
  }

  async listStandaloneGuests(weddingId: string, filters: GuestFilters = {}) {
    try {
      if (filters.householdId) return [];

      return await prisma.guest.findMany({
        where: this.buildGuestWhere(weddingId, filters, true),
        include: guestInclude,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });
    } catch (error) {
      logger.error(
        "[guest-repository] list standalone guests failed",
        error,
      );
      throw new GuestRepositoryError("Unable to load standalone guests");
    }
  }

  async searchGuests(weddingId: string, search: string) {
    return this.listGuests(weddingId, { search });
  }

  async getGuest(weddingId: string, guestId: string) {
    try {
      const guest = await prisma.guest.findFirst({
        where: { id: guestId, weddingId },
        include: guestInclude,
      });

      if (!guest) {
        throw new GuestRepositoryError("Guest not found");
      }

      return guest;
    } catch (error) {
      if (error instanceof GuestRepositoryError) throw error;
      logger.error("[guest-repository] get guest failed", error);
      throw new GuestRepositoryError("Unable to load guest");
    }
  }

  async createGuest(
    weddingId: string,
    input: GuestInput,
    sectionIds: string[] = [],
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        await this.validateGuestReferences(tx, weddingId, input);
        const validSectionIds = await this.validateSectionIds(
          tx,
          weddingId,
          sectionIds,
        );
        const guest = await tx.guest.create({
          data: { weddingId, ...input },
          include: guestInclude,
        });
        if (validSectionIds.length > 0) {
          await tx.guestSectionAssignment.createMany({
            data: validSectionIds.map((sectionId) => ({
              guestId: guest.id,
              sectionId,
            })),
          });
        }
        return tx.guest.findFirst({
          where: { id: guest.id, weddingId },
          include: guestInclude,
        });
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      if (error instanceof GuestRepositoryError) throw error;
      throwPlusOneConflict(error);
      logger.error("[guest-repository] create guest failed", error);
      throw new GuestRepositoryError("Unable to create guest");
    }
  }

  async createGuestWithPlusOne(
    weddingId: string,
    input: CreateGuestWithPlusOneInput,
  ) {
    try {
      if (input.primary.plusOneForGuestId && input.plusOne) {
        throw new GuestRepositoryError(
          "A plus-one cannot have another plus-one",
        );
      }

      const primaryId = randomUUID();
      const plusOneId = input.plusOne ? randomUUID() : null;
      const plusOne = input.plusOne
        ? {
            ...input.plusOne,
            householdId: input.primary.householdId ?? null,
            plusOneForGuestId: primaryId,
          }
        : null;

      await prisma.$transaction(async (tx) => {
        await this.validateGuestReferences(tx, weddingId, input.primary);
        const sectionIds = await this.validateSectionIds(
          tx,
          weddingId,
          input.primarySectionIds ?? [],
        );
        const plusOneSectionIds = input.plusOne
          ? await this.validateSectionIds(
              tx,
              weddingId,
              input.plusOneSectionIds ?? [],
            )
          : [];

        const tagIds = [...new Set(input.primaryTagIds)];
        const tagCount = await tx.guestTag.count({
          where: { id: { in: tagIds }, weddingId },
        });

        if (tagCount !== tagIds.length) {
          throw new GuestRepositoryError("One or more tags were not found");
        }

        await tx.guest.create({
          data: { id: primaryId, weddingId, ...input.primary },
        });
        if (plusOne && plusOneId) {
          await tx.guest.create({
            data: { id: plusOneId, weddingId, ...plusOne },
          });
        }
        if (tagIds.length > 0) {
          await tx.guestTagAssignment.createMany({
            data: tagIds.map((tagId) => ({ guestId: primaryId, tagId })),
          });
        }
        await this.replaceGuestSectionAssignments(tx, primaryId, sectionIds);
        if (plusOneId) {
          await this.replaceGuestSectionAssignments(
            tx,
            plusOneId,
            plusOneSectionIds,
          );
        }
      }, { isolationLevel: "Serializable" });

      return this.getGuest(weddingId, primaryId);
    } catch (error) {
      if (error instanceof GuestRepositoryError) throw error;
      throwPlusOneConflict(error);
      logger.error(
        "[guest-repository] create guest with plus-one failed",
        error,
      );
      throw new GuestRepositoryError("Unable to create guest");
    }
  }

  async addPlusOne(
    weddingId: string,
    guestId: string,
    input: PlusOneInput,
    sectionIds: string[] = [],
  ) {
    try {
      const plusOneId = randomUUID();
      await prisma.$transaction(async (tx) => {
        const parent = await tx.guest.findFirst({
          where: { id: guestId, weddingId },
          select: {
            id: true,
            householdId: true,
            plusOneForGuestId: true,
            plusOnes: { select: { id: true } },
          },
        });

        if (!parent) throw new GuestRepositoryError("Guest not found");
        if (parent.plusOneForGuestId) {
          throw new GuestRepositoryError(
            "A plus-one cannot have another plus-one",
          );
        }
        if (parent.plusOnes.length > 0) {
          throw new GuestRepositoryError("This guest already has a plus-one");
        }

        const validSectionIds = await this.validateSectionIds(
          tx,
          weddingId,
          sectionIds,
        );

        await tx.guest.create({
          data: {
            id: plusOneId,
            weddingId,
            ...input,
            householdId: parent.householdId,
            plusOneForGuestId: parent.id,
          },
        });
        await this.replaceGuestSectionAssignments(
          tx,
          plusOneId,
          validSectionIds,
        );
      }, { isolationLevel: "Serializable" });

      return this.getGuest(weddingId, guestId);
    } catch (error) {
      if (error instanceof GuestRepositoryError) throw error;
      throwPlusOneConflict(error);
      logger.error("[guest-repository] add plus-one failed", error);
      throw new GuestRepositoryError("Unable to add plus-one");
    }
  }

  async attachExistingGuestAsPlusOne(
    weddingId: string,
    parentGuestId: string,
    plusOneGuestId: string,
  ) {
    try {
      if (parentGuestId === plusOneGuestId) {
        throw new GuestRepositoryError("A guest cannot be their own plus-one");
      }

      await prisma.$transaction(async (tx) => {
        const parent = await tx.guest.findFirst({
          where: { id: parentGuestId, weddingId },
          select: {
            id: true,
            householdId: true,
            plusOneForGuestId: true,
            plusOnes: { select: { id: true } },
          },
        });
        const plusOne = await tx.guest.findFirst({
          where: { id: plusOneGuestId, weddingId },
          select: {
            id: true,
            householdId: true,
            plusOneForGuestId: true,
            plusOnes: { select: { id: true } },
            household: { select: { primaryGuestId: true } },
          },
        });

        if (!parent || !plusOne) {
          throw new GuestRepositoryError("Guest not found in this wedding");
        }
        if (parent.plusOneForGuestId) {
          throw new GuestRepositoryError(
            "A plus-one cannot have another plus-one",
          );
        }
        if (parent.plusOnes.length > 0) {
          throw new GuestRepositoryError("This guest already has a plus-one");
        }
        if (plusOne.plusOneForGuestId) {
          throw new GuestRepositoryError("This guest is already a plus-one");
        }
        if (plusOne.plusOnes.length > 0) {
          throw new GuestRepositoryError(
            "A guest with a plus-one cannot become a plus-one",
          );
        }
        if (plusOne.household?.primaryGuestId === plusOne.id) {
          throw new GuestRepositoryError(
            "Change this guest's household primary invitee before attaching them as a plus-one",
          );
        }
        if (plusOne.householdId !== parent.householdId) {
          throw new GuestRepositoryError(
            "A guest and their plus-one must belong to the same household",
          );
        }

        // The conditional write is authoritative. A stale read cannot
        // silently re-parent a guest another request has already attached.
        const result = await tx.guest.updateMany({
          where: {
            id: plusOne.id,
            weddingId,
            householdId: parent.householdId,
            plusOneForGuestId: null,
          },
          data: { plusOneForGuestId: parent.id },
        });

        if (result.count !== 1) {
          throw new GuestRepositoryError(
            "This guest changed before the plus-one relationship could be saved",
          );
        }
      }, { isolationLevel: "Serializable" });

      return this.getGuest(weddingId, parentGuestId);
    } catch (error) {
      if (error instanceof GuestRepositoryError) throw error;
      throwPlusOneConflict(error);
      logger.error(
        "[guest-repository] attach existing plus-one failed",
        error,
      );
      throw new GuestRepositoryError("Unable to attach existing plus-one");
    }
  }

  async updateGuest(
    weddingId: string,
    guestId: string,
    input: GuestInput,
    tagIds?: string[],
    sectionIds?: string[],
  ) {
    try {
      const guestData = { ...input };
      delete guestData.plusOneForGuestId;
      const householdId = guestData.householdId ?? null;

      return await prisma.$transaction(async (tx) => {
        const currentGuest = await tx.guest.findFirst({
          where: { id: guestId, weddingId },
          select: { id: true },
        });

        if (!currentGuest) throw new GuestRepositoryError("Guest not found");

        await this.moveGuestWithinTransaction(
          tx,
          weddingId,
          guestId,
          householdId,
        );

        if (tagIds !== undefined) {
          const uniqueTagIds = [...new Set(tagIds)];
          const tagCount = await tx.guestTag.count({
            where: { id: { in: uniqueTagIds }, weddingId },
          });

          if (tagCount !== uniqueTagIds.length) {
            throw new GuestRepositoryError("One or more tags were not found");
          }

          await tx.guestTagAssignment.deleteMany({
            where: { guestId },
          });
          if (uniqueTagIds.length > 0) {
            await tx.guestTagAssignment.createMany({
              data: uniqueTagIds.map((tagId) => ({ guestId, tagId })),
              skipDuplicates: true,
            });
          }
        }

        if (sectionIds !== undefined) {
          const existingAssignments = await tx.guestSectionAssignment.findMany({
            where: { guestId },
            select: { sectionId: true },
          });
          const validSectionIds = await this.validateSectionIds(
            tx,
            weddingId,
            sectionIds,
            new Set(existingAssignments.map((assignment) => assignment.sectionId)),
          );
          await this.replaceGuestSectionAssignments(
            tx,
            guestId,
            validSectionIds,
          );
        }

        await tx.guest.update({
          where: { id: guestId },
          data: { ...guestData, householdId },
        });

        return tx.guest.findFirst({
          where: { id: guestId, weddingId },
          include: guestInclude,
        });
      }, { isolationLevel: "Serializable" }).then((guest) => {
        if (!guest) throw new GuestRepositoryError("Guest not found");
        return guest;
      });
    } catch (error) {
      if (error instanceof GuestRepositoryError) throw error;
      throwPlusOneConflict(error);
      logger.error("[guest-repository] update guest failed", error);
      throw new GuestRepositoryError("Unable to update guest");
    }
  }

  async deleteGuest(weddingId: string, guestId: string) {
    try {
      await prisma.$transaction(async (tx) => {
        const guest = await tx.guest.findFirst({
          where: { id: guestId, weddingId },
          select: { id: true, householdId: true },
        });

        if (!guest) throw new GuestRepositoryError("Guest not found");

        await tx.household.updateMany({
          where: { weddingId, primaryGuestId: guestId },
          data: { primaryGuestId: null },
        });
        await tx.guestSectionAssignment.deleteMany({ where: { guestId } });
        await tx.guest.delete({ where: { id: guestId } });

        if (guest.householdId) {
          await ensureHouseholdPrimaryGuest(tx, weddingId, guest.householdId);
        }
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      if (error instanceof GuestRepositoryError) throw error;
      logger.error("[guest-repository] delete guest failed", error);
      throw new GuestRepositoryError("Unable to delete guest");
    }
  }

  async assignGuestToHousehold(
    weddingId: string,
    guestId: string,
    householdId: string,
  ) {
    try {
      await prisma.$transaction(async (tx) => {
        await this.moveGuestWithinTransaction(
          tx,
          weddingId,
          guestId,
          householdId,
        );
      }, { isolationLevel: "Serializable" });
      return this.getGuest(weddingId, guestId);
    } catch (error) {
      if (error instanceof GuestRepositoryError) throw error;
      logger.error("[guest-repository] assign guest to household failed", error);
      throw new GuestRepositoryError("Unable to assign guest to household");
    }
  }

  async removeGuestFromHousehold(weddingId: string, guestId: string) {
    try {
      await prisma.$transaction(async (tx) => {
        await this.moveGuestWithinTransaction(tx, weddingId, guestId, null);
      }, { isolationLevel: "Serializable" });
      return this.getGuest(weddingId, guestId);
    } catch (error) {
      if (error instanceof GuestRepositoryError) throw error;
      logger.error("[guest-repository] remove guest from household failed", error);
      throw new GuestRepositoryError("Unable to remove guest from household");
    }
  }

  async removePlusOneRelationship(weddingId: string, guestId: string) {
    try {
      await this.ensureGuestBelongsToWedding(guestId, weddingId);

      return await prisma.guest.update({
        where: { id: guestId },
        data: { plusOneForGuestId: null },
        include: guestInclude,
      });
    } catch (error) {
      if (error instanceof GuestRepositoryError) throw error;
      logger.error(
        "[guest-repository] remove plus-one relationship failed",
        error,
      );
      throw new GuestRepositoryError("Unable to remove plus-one relationship");
    }
  }

  async setGuestTags(weddingId: string, guestId: string, tagIds: string[]) {
    try {
      await this.ensureGuestBelongsToWedding(guestId, weddingId);
      const uniqueTagIds = [...new Set(tagIds)];

      const tagCount = await prisma.guestTag.count({
        where: { id: { in: uniqueTagIds }, weddingId },
      });

      if (tagCount !== uniqueTagIds.length) {
        throw new GuestRepositoryError("One or more tags were not found");
      }

      await prisma.$transaction([
        prisma.guestTagAssignment.deleteMany({ where: { guestId } }),
        prisma.guestTagAssignment.createMany({
          data: uniqueTagIds.map((tagId) => ({ guestId, tagId })),
          skipDuplicates: true,
        }),
      ]);

      return this.getGuest(weddingId, guestId);
    } catch (error) {
      if (error instanceof GuestRepositoryError) throw error;
      logger.error("[guest-repository] set guest tags failed", error);
      throw new GuestRepositoryError("Unable to update guest tags");
    }
  }
}

export const guestRepository = new GuestRepository();
