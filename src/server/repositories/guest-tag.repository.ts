import "server-only";

import { prisma } from "../db/prisma";
import { logger } from "../logging/logger";

export type GuestTagInput = {
  name: string;
  colour?: string | null;
};

export class GuestTagRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuestTagRepositoryError";
  }
}

export class GuestTagRepository {
  async ensureTagsBelongToWedding(weddingId: string, tagIds: string[]) {
    try {
      const uniqueTagIds = [...new Set(tagIds)];
      const count = await prisma.guestTag.count({
        where: { id: { in: uniqueTagIds }, weddingId },
      });

      if (count !== uniqueTagIds.length) {
        throw new GuestTagRepositoryError("One or more tags were not found");
      }
    } catch (error) {
      if (error instanceof GuestTagRepositoryError) throw error;
      logger.error("[guest-tag-repository] validate tags failed", error);
      throw new GuestTagRepositoryError("Unable to validate guest tags");
    }
  }

  async listTags(weddingId: string) {
    try {
      return await prisma.guestTag.findMany({
        where: { weddingId },
        orderBy: { name: "asc" },
        include: { _count: { select: { assignments: true } } },
      });
    } catch (error) {
      logger.error("[guest-tag-repository] list tags failed", error);
      throw new GuestTagRepositoryError("Unable to load guest tags");
    }
  }

  async createTag(weddingId: string, input: GuestTagInput) {
    try {
      return await prisma.guestTag.create({
        data: { weddingId, ...input },
      });
    } catch (error) {
      logger.error("[guest-tag-repository] create tag failed", error);
      throw new GuestTagRepositoryError(
        "Unable to create guest tag. A tag with this name may already exist.",
      );
    }
  }

  async updateTag(weddingId: string, tagId: string, input: GuestTagInput) {
    try {
      const tag = await prisma.guestTag.findFirst({
        where: { id: tagId, weddingId },
        select: { id: true },
      });

      if (!tag) throw new GuestTagRepositoryError("Guest tag not found");

      return await prisma.guestTag.update({
        where: { id: tagId },
        data: input,
      });
    } catch (error) {
      if (error instanceof GuestTagRepositoryError) throw error;
      logger.error("[guest-tag-repository] update tag failed", error);
      throw new GuestTagRepositoryError(
        "Unable to update guest tag. A tag with this name may already exist.",
      );
    }
  }

  async deleteTag(weddingId: string, tagId: string) {
    try {
      const tag = await prisma.guestTag.findFirst({
        where: { id: tagId, weddingId },
        select: { id: true },
      });

      if (!tag) throw new GuestTagRepositoryError("Guest tag not found");
      await prisma.guestTag.delete({ where: { id: tagId } });
    } catch (error) {
      if (error instanceof GuestTagRepositoryError) throw error;
      logger.error("[guest-tag-repository] delete tag failed", error);
      throw new GuestTagRepositoryError("Unable to delete guest tag");
    }
  }

  async assignTagToGuest(weddingId: string, guestId: string, tagId: string) {
    try {
      const guest = await prisma.guest.findFirst({
        where: { id: guestId, weddingId },
        select: { id: true },
      });
      const tag = await prisma.guestTag.findFirst({
        where: { id: tagId, weddingId },
        select: { id: true },
      });

      if (!guest) throw new GuestTagRepositoryError("Guest not found");
      if (!tag) throw new GuestTagRepositoryError("Guest tag not found");

      return await prisma.guestTagAssignment.upsert({
        where: { guestId_tagId: { guestId, tagId } },
        create: { guestId, tagId },
        update: {},
      });
    } catch (error) {
      if (error instanceof GuestTagRepositoryError) throw error;
      logger.error("[guest-tag-repository] assign tag failed", error);
      throw new GuestTagRepositoryError("Unable to assign guest tag");
    }
  }

  async removeTagFromGuest(weddingId: string, guestId: string, tagId: string) {
    try {
      const guest = await prisma.guest.findFirst({
        where: { id: guestId, weddingId },
        select: { id: true },
      });

      if (!guest) throw new GuestTagRepositoryError("Guest not found");

      await prisma.guestTagAssignment.deleteMany({
        where: { guestId, tagId, tag: { weddingId } },
      });
    } catch (error) {
      if (error instanceof GuestTagRepositoryError) throw error;
      logger.error("[guest-tag-repository] remove tag failed", error);
      throw new GuestTagRepositoryError("Unable to remove guest tag");
    }
  }
}

export const guestTagRepository = new GuestTagRepository();
