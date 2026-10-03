import "server-only";

import type { Prisma } from "../../../app/generated/prisma/client";
import { prisma } from "../db/prisma";
import { logger } from "../logging/logger";

export const DEFAULT_WEDDING_SECTION_DEFINITIONS = [
  {
    name: "Ceremony",
    description: null,
    position: 0,
    active: true,
  },
  {
    name: "Venue",
    description: null,
    position: 1,
    active: true,
  },
] as const;

const sectionSelect = {
  id: true,
  name: true,
  description: true,
  position: true,
  active: true,
} satisfies Prisma.WeddingSectionSelect;

const sectionOrderBy: Prisma.WeddingSectionOrderByWithRelationInput[] = [
  { position: "asc" },
  { createdAt: "asc" },
  { id: "asc" },
];

export type WeddingSectionData = Prisma.WeddingSectionGetPayload<{
  select: typeof sectionSelect;
}>;

export type CreateWeddingSectionInput = {
  name: string;
  description: string | null;
};

export type UpdateWeddingSectionInput = {
  name: string;
  description: string | null;
  active?: boolean;
};

type WeddingSectionDb = Prisma.TransactionClient | typeof prisma;

export class WeddingSectionRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeddingSectionRepositoryError";
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

export class WeddingSectionRepository {
  async getSections(weddingId: string): Promise<WeddingSectionData[]> {
    return this.execute("load wedding day sections", () =>
      this.getOrderedSections(prisma, weddingId),
    );
  }

  async initializeDefaults(weddingId: string): Promise<WeddingSectionData[]> {
    return this.execute("initialize wedding day sections", () =>
      prisma.$transaction(async (tx) => {
        const sections = await this.getOrderedSections(tx, weddingId);
        if (sections.length > 0) return sections;

        await tx.weddingSection.createMany({
          data: DEFAULT_WEDDING_SECTION_DEFINITIONS.map((definition) => ({
            weddingId,
            ...definition,
          })),
          skipDuplicates: true,
        });

        return this.getOrderedSections(tx, weddingId);
      }, { isolationLevel: "Serializable" }),
    );
  }

  async createSection(
    weddingId: string,
    input: CreateWeddingSectionInput,
  ): Promise<WeddingSectionData[]> {
    return this.execute("create wedding day section", () =>
      prisma.$transaction(async (tx) => {
        const sections = await this.getOrderedSections(tx, weddingId);
        const duplicate = await this.findNameConflict(tx, weddingId, input.name);

        if (duplicate) {
          throw new WeddingSectionRepositoryError(
            "A wedding day section with this name already exists.",
          );
        }

        const normalizedSections = await this.normalizePositions(
          tx,
          sections,
        );
        const section = await tx.weddingSection.create({
          data: {
            weddingId,
            name: input.name,
            description: input.description,
            position: normalizedSections.length,
            active: true,
          },
          select: sectionSelect,
        });

        return [...normalizedSections, section];
      }),
    );
  }

  async updateSection(
    weddingId: string,
    sectionId: string,
    input: UpdateWeddingSectionInput,
  ): Promise<WeddingSectionData[]> {
    return this.execute("update wedding day section", () =>
      prisma.$transaction(async (tx) => {
        const section = await tx.weddingSection.findFirst({
          where: { id: sectionId, weddingId },
          select: { id: true },
        });

        if (!section) {
          throw new WeddingSectionRepositoryError("Wedding day section not found.");
        }

        const duplicate = await this.findNameConflict(
          tx,
          weddingId,
          input.name,
          sectionId,
        );

        if (duplicate) {
          throw new WeddingSectionRepositoryError(
            "A wedding day section with this name already exists.",
          );
        }

        await tx.weddingSection.update({
          where: { id: sectionId },
          data: {
            name: input.name,
            description: input.description,
            ...(input.active === undefined ? {} : { active: input.active }),
          },
        });

        const sections = await this.getOrderedSections(tx, weddingId);
        return sections;
      }),
    );
  }

  async setActive(
    weddingId: string,
    sectionId: string,
    active: boolean,
  ): Promise<WeddingSectionData[]> {
    return this.execute("change wedding day section availability", () =>
      prisma.$transaction(async (tx) => {
        const result = await tx.weddingSection.updateMany({
          where: { id: sectionId, weddingId },
          data: { active },
        });

        if (result.count !== 1) {
          throw new WeddingSectionRepositoryError("Wedding day section not found.");
        }

        const sections = await this.getOrderedSections(tx, weddingId);
        return sections;
      }),
    );
  }

  async reorderSections(
    weddingId: string,
    sectionIds: readonly string[],
  ): Promise<WeddingSectionData[]> {
    return this.execute("reorder wedding day sections", () =>
      prisma.$transaction(async (tx) => {
        const sections = await this.getOrderedSections(tx, weddingId);
        const existingIds = new Set(sections.map((section) => section.id));
        const requestedIds = new Set(sectionIds);

        if (
          sectionIds.length !== sections.length ||
          requestedIds.size !== sectionIds.length ||
          sectionIds.some((sectionId) => !existingIds.has(sectionId))
        ) {
          throw new WeddingSectionRepositoryError("The wedding day section order is invalid.");
        }

        const sectionsById = new Map(sections.map((section) => [section.id, section]));
        const reordered: WeddingSectionData[] = [];

        for (const [position, sectionId] of sectionIds.entries()) {
          const section = sectionsById.get(sectionId);
          if (!section) {
            throw new WeddingSectionRepositoryError("The wedding day section order is invalid.");
          }

          if (section.position !== position) {
            await tx.weddingSection.update({
              where: { id: sectionId },
              data: { position },
            });
          }

          reordered.push({ ...section, position });
        }

        return reordered;
      }),
    );
  }

  async deleteSection(
    weddingId: string,
    sectionId: string,
  ): Promise<WeddingSectionData[]> {
    return this.execute("delete wedding day section", () =>
      prisma.$transaction(async (tx) => {
        const section = await tx.weddingSection.findFirst({
          where: { id: sectionId, weddingId },
          select: { id: true },
        });

        if (!section) {
          throw new WeddingSectionRepositoryError("Wedding day section not found.");
        }

        const assignmentCount = await tx.guestSectionAssignment.count({
          where: { sectionId },
        });
        if (assignmentCount > 0) {
          throw new WeddingSectionRepositoryError(
            "This section cannot be deleted while guests are assigned to it. Deactivate the section or remove its guest assignments first.",
          );
        }

        await tx.weddingSection.delete({ where: { id: sectionId } });

        const sections = await this.getOrderedSections(tx, weddingId);
        return this.normalizePositions(tx, sections);
      }, { isolationLevel: "Serializable" }),
    );
  }

  private async getOrderedSections(
    db: WeddingSectionDb,
    weddingId: string,
  ): Promise<WeddingSectionData[]> {
    return db.weddingSection.findMany({
      where: { weddingId },
      select: sectionSelect,
      orderBy: sectionOrderBy,
    });
  }

  private async findNameConflict(
    db: WeddingSectionDb,
    weddingId: string,
    name: string,
    excludeId?: string,
  ) {
    return db.weddingSection.findFirst({
      where: {
        weddingId,
        name: { equals: name, mode: "insensitive" },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
  }

  private async normalizePositions(
    db: WeddingSectionDb,
    sections: readonly WeddingSectionData[],
  ): Promise<WeddingSectionData[]> {
    const normalized = sections.map((section, position) => ({
      ...section,
      position,
    }));

    for (const section of normalized) {
      const current = sections.find((candidate) => candidate.id === section.id);
      if (current?.position === section.position) continue;

      await db.weddingSection.update({
        where: { id: section.id },
        data: { position: section.position },
      });
    }

    return normalized;
  }

  private async execute<T>(operation: string, action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (error instanceof WeddingSectionRepositoryError) throw error;

      if (isPrismaError(error, "P2002")) {
        throw new WeddingSectionRepositoryError(
          "A wedding day section with this name already exists.",
        );
      }

      if (isPrismaError(error, "P2025")) {
        throw new WeddingSectionRepositoryError(
          `Cannot ${operation}: the requested section was not found.`,
        );
      }

      logger.error(`[wedding-section-repository] ${operation} failed`, error);
      throw new WeddingSectionRepositoryError(`Unable to ${operation}.`);
    }
  }
}

export const weddingSectionRepository = new WeddingSectionRepository();
