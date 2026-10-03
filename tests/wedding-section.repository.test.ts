import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const weddingSection = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    createMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  };
  const guestSectionAssignment = { count: vi.fn() };

  return {
    prisma: {
      $transaction: vi.fn(),
      wedding: { create: vi.fn() },
      weddingSection,
      guestSectionAssignment,
    },
    tx: { weddingSection, guestSectionAssignment },
  };
});

vi.mock("server-only", () => ({}));
vi.mock("../src/server/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("../src/server/logging/logger", () => ({
  logger: { error: vi.fn() },
}));

import { weddingRepository } from "../src/server/repositories/wedding.repository";
import {
  DEFAULT_WEDDING_SECTION_DEFINITIONS,
  weddingSectionRepository,
  WeddingSectionRepositoryError,
} from "../src/server/repositories/wedding-section.repository";

type TestSection = {
  id: string;
  name: string;
  description: string | null;
  position: number;
  active: boolean;
};

const defaultSections: TestSection[] = DEFAULT_WEDDING_SECTION_DEFINITIONS.map((definition, index) => ({
  id: `section_${index + 1}`,
  ...definition,
}));

function makeSection(overrides: Partial<TestSection> = {}): TestSection {
  return {
    id: "section_1",
    name: "Ceremony",
    description: null,
    position: 0,
    active: true,
    ...overrides,
  };
}

describe("wedding section repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation(async (callback) => callback(mocks.tx));
    mocks.prisma.weddingSection.findMany.mockResolvedValue([]);
    mocks.prisma.weddingSection.findFirst.mockResolvedValue(null);
    mocks.prisma.weddingSection.createMany.mockResolvedValue({ count: 2 });
    mocks.prisma.weddingSection.create.mockResolvedValue(makeSection({ id: "section_3" }));
    mocks.prisma.weddingSection.update.mockResolvedValue(makeSection());
    mocks.prisma.weddingSection.updateMany.mockResolvedValue({ count: 1 });
    mocks.prisma.weddingSection.delete.mockResolvedValue(makeSection());
    mocks.prisma.guestSectionAssignment.count.mockResolvedValue(0);
  });

  it("creates Ceremony and Venue transactionally with a new wedding", async () => {
    mocks.prisma.wedding.create.mockResolvedValue({
      id: "wedding_1",
      members: [{ id: "membership_1" }],
    });

    await weddingRepository.createWeddingWithOwner({
      userId: "user_1",
      name: "Ada & Charles",
      partnerOneName: "Ada",
      partnerTwoName: "Charles",
      weddingDate: new Date("2027-06-01T00:00:00.000Z"),
      timezone: "Europe/London",
      currencyCode: "GBP",
      ceremonyLocation: null,
      receptionLocation: null,
    });

    expect(mocks.prisma.wedding.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          weddingSections: {
            create: [
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
            ],
          },
        }),
      }),
    );
  });

  it("does not alter existing section data when it is read", async () => {
    const existingSections = [
      makeSection({ name: "My Ceremony", description: "Custom", position: 8 }),
      makeSection({ id: "section_2", name: "Dinner", position: 20, active: false }),
    ];
    mocks.prisma.weddingSection.findMany.mockResolvedValue(existingSections);

    await expect(weddingSectionRepository.getSections("wedding_1")).resolves.toEqual(
      existingSections,
    );

    expect(mocks.prisma.weddingSection.createMany).not.toHaveBeenCalled();
    expect(mocks.prisma.weddingSection.update).not.toHaveBeenCalled();
  });

  it("creates defaults for an existing wedding with no sections only when initialized", async () => {
    mocks.prisma.weddingSection.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(defaultSections);

    await expect(weddingSectionRepository.initializeDefaults("wedding_1")).resolves.toEqual(
      defaultSections,
    );

    expect(mocks.prisma.weddingSection.createMany).toHaveBeenCalledWith({
      data: [
        {
          weddingId: "wedding_1",
          name: "Ceremony",
          description: null,
          position: 0,
          active: true,
        },
        {
          weddingId: "wedding_1",
          name: "Venue",
          description: null,
          position: 1,
          active: true,
        },
      ],
      skipDuplicates: true,
    });
  });

  it("appends a new section after normalized existing sections", async () => {
    const existingSections = [
      makeSection({ position: 8 }),
      makeSection({ id: "section_2", name: "Dinner", position: 20 }),
    ];
    mocks.prisma.weddingSection.findMany.mockResolvedValue(existingSections);
    mocks.prisma.weddingSection.create.mockResolvedValue(
      makeSection({ id: "section_3", name: "Evening", position: 2 }),
    );

    const result = await weddingSectionRepository.createSection("wedding_1", {
      name: "Evening",
      description: "Celebration",
    });

    expect(mocks.prisma.weddingSection.create).toHaveBeenCalledWith({
      data: {
        weddingId: "wedding_1",
        name: "Evening",
        description: "Celebration",
        position: 2,
        active: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        position: true,
        active: true,
      },
    });
    expect(result.map((section) => section.position)).toEqual([0, 1, 2]);
  });

  it("rejects duplicate names case-insensitively within one wedding", async () => {
    mocks.prisma.weddingSection.findMany.mockResolvedValue([makeSection()]);
    mocks.prisma.weddingSection.findFirst.mockResolvedValue({ id: "section_1" });

    await expect(
      weddingSectionRepository.createSection("wedding_1", {
        name: "ceremony",
        description: null,
      }),
    ).rejects.toThrow("A wedding day section with this name already exists.");

    expect(mocks.prisma.weddingSection.create).not.toHaveBeenCalled();
  });

  it("rejects a section from another wedding", async () => {
    mocks.prisma.weddingSection.findFirst.mockResolvedValue(null);

    await expect(
      weddingSectionRepository.updateSection("wedding_1", "section_from_other_wedding", {
        name: "Renamed",
        description: null,
      }),
    ).rejects.toThrow(WeddingSectionRepositoryError);

    expect(mocks.prisma.weddingSection.update).not.toHaveBeenCalled();
  });

  it("reorders with sequential positions", async () => {
    const sections = [
      makeSection(),
      makeSection({ id: "section_2", name: "Venue", position: 1 }),
    ];
    mocks.prisma.weddingSection.findMany.mockResolvedValue(sections);

    const result = await weddingSectionRepository.reorderSections("wedding_1", [
      "section_2",
      "section_1",
    ]);

    expect(mocks.prisma.weddingSection.update).toHaveBeenCalledWith({
      where: { id: "section_2" },
      data: { position: 0 },
    });
    expect(mocks.prisma.weddingSection.update).toHaveBeenCalledWith({
      where: { id: "section_1" },
      data: { position: 1 },
    });
    expect(result.map((section) => section.position)).toEqual([0, 1]);
  });

  it("deletes a section and compacts the remaining positions", async () => {
    const remaining = [makeSection({ id: "section_2", name: "Venue", position: 1 })];
    mocks.prisma.weddingSection.findFirst.mockResolvedValue({ id: "section_1" });
    mocks.prisma.weddingSection.findMany.mockResolvedValue(remaining);

    const result = await weddingSectionRepository.deleteSection("wedding_1", "section_1");

    expect(mocks.prisma.weddingSection.delete).toHaveBeenCalledWith({
      where: { id: "section_1" },
    });
    expect(mocks.prisma.weddingSection.update).toHaveBeenCalledWith({
      where: { id: "section_2" },
      data: { position: 0 },
    });
    expect(result.map((section) => section.position)).toEqual([0]);
  });

  it("blocks deletion while guests are assigned", async () => {
    mocks.prisma.weddingSection.findFirst.mockResolvedValue({ id: "section_1" });
    mocks.prisma.guestSectionAssignment.count.mockResolvedValue(1);

    await expect(
      weddingSectionRepository.deleteSection("wedding_1", "section_1"),
    ).rejects.toThrow("guests are assigned");
    expect(mocks.prisma.weddingSection.delete).not.toHaveBeenCalled();
  });

  it("allows deactivation without touching guest assignments", async () => {
    mocks.prisma.weddingSection.updateMany.mockResolvedValue({ count: 1 });
    mocks.prisma.weddingSection.findMany.mockResolvedValue([
      makeSection({ active: false }),
    ]);

    await weddingSectionRepository.setActive("wedding_1", "section_1", false);

    expect(mocks.prisma.weddingSection.updateMany).toHaveBeenCalledWith({
      where: { id: "section_1", weddingId: "wedding_1" },
      data: { active: false },
    });
    expect(mocks.prisma.guestSectionAssignment.count).not.toHaveBeenCalled();
  });
});
