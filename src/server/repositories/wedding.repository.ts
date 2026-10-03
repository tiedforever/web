import "server-only";

import {
  MembershipStatus,
  WeddingMemberRole,
} from "../../../app/generated/prisma/client";
import { prisma } from "../db/prisma";
import { logger } from "../logging/logger";
import { DEFAULT_WEDDING_SECTION_DEFINITIONS } from "./wedding-section.repository";

export type CreateWeddingRepositoryInput = {
  userId: string;
  name: string;
  partnerOneName: string;
  partnerTwoName: string;
  weddingDate: Date;
  timezone: string;
  currencyCode: string;
  ceremonyLocation: string | null;
  receptionLocation: string | null;
};

export type WeddingGeneralSettingsInput = {
  name: string;
  partnerOneName: string;
  partnerTwoName: string;
  weddingDate: Date;
  timezone: string;
  currencyCode: string;
  mealChoicesEnabled: boolean;
  dietaryRequirementsEnabled: boolean;
};

export type WeddingLocationsInput = {
  ceremonyLocation: string | null;
  receptionLocation: string | null;
};

export class WeddingRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeddingRepositoryError";
  }
}

export class WeddingRepository {
  async getWeddingGeneralSettings(weddingId: string) {
    try {
      const wedding = await prisma.wedding.findUnique({
        where: { id: weddingId },
        select: {
          id: true,
          name: true,
          partnerOneName: true,
          partnerTwoName: true,
          weddingDate: true,
          timezone: true,
          currencyCode: true,
          mealChoicesEnabled: true,
          dietaryRequirementsEnabled: true,
        },
      });

      if (!wedding) throw new WeddingRepositoryError("Wedding not found");
      return wedding;
    } catch (error) {
      if (error instanceof WeddingRepositoryError) throw error;
      logger.error("[wedding-repository] load general settings failed", error);
      throw new WeddingRepositoryError("Unable to load wedding settings");
    }
  }

  async updateWeddingGeneralSettings(
    weddingId: string,
    input: WeddingGeneralSettingsInput,
  ) {
    try {
      return await prisma.wedding.update({
        where: { id: weddingId },
        data: input,
        select: {
          id: true,
          name: true,
          partnerOneName: true,
          partnerTwoName: true,
          weddingDate: true,
          timezone: true,
          currencyCode: true,
          mealChoicesEnabled: true,
          dietaryRequirementsEnabled: true,
        },
      });
    } catch (error) {
      logger.error("[wedding-repository] update general settings failed", error);
      throw new WeddingRepositoryError("Unable to save wedding settings");
    }
  }

  async getWeddingLocations(weddingId: string) {
    try {
      const wedding = await prisma.wedding.findUnique({
        where: { id: weddingId },
        select: {
          id: true,
          ceremonyLocation: true,
          receptionLocation: true,
        },
      });

      if (!wedding) throw new WeddingRepositoryError("Wedding not found");
      return wedding;
    } catch (error) {
      if (error instanceof WeddingRepositoryError) throw error;
      logger.error("[wedding-repository] load wedding locations failed", error);
      throw new WeddingRepositoryError("Unable to load wedding locations");
    }
  }

  async updateWeddingLocations(
    weddingId: string,
    input: WeddingLocationsInput,
  ) {
    try {
      return await prisma.wedding.update({
        where: { id: weddingId },
        data: input,
        select: {
          id: true,
          ceremonyLocation: true,
          receptionLocation: true,
        },
      });
    } catch (error) {
      logger.error("[wedding-repository] update wedding locations failed", error);
      throw new WeddingRepositoryError("Unable to save wedding locations");
    }
  }

  async createWeddingWithOwner(input: CreateWeddingRepositoryInput) {
    try {
      return await prisma.wedding.create({
        data: {
          name: input.name,
          partnerOneName: input.partnerOneName,
          partnerTwoName: input.partnerTwoName,
          weddingDate: input.weddingDate,
          timezone: input.timezone,
          currencyCode: input.currencyCode,
          ceremonyLocation: input.ceremonyLocation,
          receptionLocation: input.receptionLocation,
          totalBudgetMinor: null,
          mealChoicesEnabled: true,
          dietaryRequirementsEnabled: true,
          members: {
            create: {
              userId: input.userId,
              role: WeddingMemberRole.OWNER,
              status: MembershipStatus.ACTIVE,
              joinedAt: new Date(),
            },
          },
          weddingSections: {
            create: DEFAULT_WEDDING_SECTION_DEFINITIONS.map((definition) => ({
              name: definition.name,
              description: definition.description,
              position: definition.position,
              active: definition.active,
            })),
          },
        },
        include: { members: true },
      });
    } catch (error) {
      logger.error("[wedding-repository] create wedding failed", error);
      throw new WeddingRepositoryError("Unable to create wedding");
    }
  }

  async getActiveMembership(userId: string, weddingId: string) {
    try {
      const membership = await prisma.weddingMember.findUnique({
        where: {
          weddingId_userId: {
            weddingId,
            userId,
          },
        },
      });

      return membership?.status === MembershipStatus.ACTIVE
        ? membership
        : null;
    } catch (error) {
      logger.error("[wedding-repository] load membership failed", error);
      throw new WeddingRepositoryError("Unable to verify wedding membership");
    }
  }

  async listActiveMembers(weddingId: string) {
    try {
      return await prisma.weddingMember.findMany({
        where: {
          weddingId,
          status: MembershipStatus.ACTIVE,
        },
        select: {
          id: true,
          role: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              profileImageUrl: true,
            },
          },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
    } catch (error) {
      logger.error("[wedding-repository] list active members failed", error);
      throw new WeddingRepositoryError("Unable to load wedding members");
    }
  }

  async setActiveWedding(userId: string, weddingId: string) {
    try {
      return await prisma.userPreference.upsert({
        where: { userId },
        create: {
          userId,
          activeWeddingId: weddingId,
          theme: "light",
          emailNotificationsEnabled: true,
          taskNotificationsEnabled: true,
          paymentNotificationsEnabled: true,
        },
        update: { activeWeddingId: weddingId },
      });
    } catch (error) {
      logger.error("[wedding-repository] set active wedding failed", error);
      throw new WeddingRepositoryError("Unable to save active wedding");
    }
  }

  async deleteWedding(weddingId: string, userId: string) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Clear preferences before deleting the Wedding. Member invitations, guests,
        // households, tags, and sections are removed by their declared
        // database cascades when the Wedding is deleted.
        await tx.userPreference.updateMany({
          where: { activeWeddingId: weddingId },
          data: { activeWeddingId: null },
        });

        // Delete dependent checklist records explicitly so the category/task
        // restriction cannot block deletion of the Wedding. Task links and
        // recurrence rows cascade from their tasks.
        await tx.task.deleteMany({ where: { weddingId } });
        await tx.taskCategory.deleteMany({ where: { weddingId } });
        await tx.weddingMember.deleteMany({ where: { weddingId } });
        await tx.wedding.delete({ where: { id: weddingId } });

        const nextMembership = await tx.weddingMember.findFirst({
          where: {
            userId,
            status: MembershipStatus.ACTIVE,
          },
          select: { weddingId: true },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        });

        if (nextMembership) {
          await tx.userPreference.upsert({
            where: { userId },
            create: {
              userId,
              activeWeddingId: nextMembership.weddingId,
              theme: "light",
              emailNotificationsEnabled: true,
              taskNotificationsEnabled: true,
              paymentNotificationsEnabled: true,
            },
            update: { activeWeddingId: nextMembership.weddingId },
          });
        }

        return { nextWeddingId: nextMembership?.weddingId ?? null };
      });
    } catch (error) {
      logger.error("[wedding-repository] delete wedding failed", error);
      throw new WeddingRepositoryError("Unable to delete wedding");
    }
  }
}

export const weddingRepository = new WeddingRepository();
