import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    guest: { groupBy: vi.fn() },
    household: { count: vi.fn() },
    task: { groupBy: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("../src/server/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("../src/server/logging/logger", () => ({
  logger: { error: vi.fn() },
}));

import { dashboardRepository } from "../src/server/repositories/dashboard.repository";

describe("dashboardRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.guest.groupBy.mockResolvedValue([
      { householdId: null, _count: { _all: 2 } },
      { householdId: "household_1", _count: { _all: 3 } },
    ]);
    mocks.prisma.household.count.mockResolvedValue(2);
    mocks.prisma.task.groupBy.mockResolvedValue([
      { status: "NOT_STARTED", _count: { _all: 4 } },
      { status: "COMPLETED", _count: { _all: 2 } },
      { status: "CANCELLED", _count: { _all: 1 } },
    ]);
    mocks.prisma.task.findMany.mockResolvedValue([
      {
        id: "task_1",
        title: "Book photographer",
        status: "NOT_STARTED",
        priority: "HIGH",
        dueDate: new Date("2026-06-01T00:00:00.000Z"),
      },
    ]);
  });

  it("scopes all dashboard queries to the supplied wedding", async () => {
    const result = await dashboardRepository.getDashboardSummary("wedding_1");

    expect(result.guestCount).toBe(5);
    expect(result.unassignedGuestCount).toBe(2);
    expect(result.householdCount).toBe(2);
    expect(result.taskCount).toBe(7);
    expect(result.completedTaskCount).toBe(2);

    expect(mocks.prisma.guest.groupBy).toHaveBeenCalledWith({
      by: ["householdId"],
      where: { weddingId: "wedding_1" },
      _count: { _all: true },
    });
    expect(mocks.prisma.household.count).toHaveBeenCalledWith({
      where: { weddingId: "wedding_1" },
    });
    expect(mocks.prisma.task.groupBy).toHaveBeenCalledWith({
      by: ["status"],
      where: { weddingId: "wedding_1" },
      _count: { _all: true },
    });
    expect(mocks.prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ weddingId: "wedding_1" }),
      }),
    );
  });

  it("requests only valid upcoming tasks with dashboard fields and deterministic ordering", async () => {
    await dashboardRepository.getDashboardSummary("wedding_1");

    expect(mocks.prisma.task.findMany).toHaveBeenCalledWith({
      where: {
        weddingId: "wedding_1",
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        dueDate: { not: null },
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
      },
      orderBy: [
        { dueDate: "asc" },
        { category: { position: "asc" } },
        { category: { createdAt: "asc" } },
        { position: "asc" },
        { createdAt: "asc" },
      ],
      take: 5,
    });
    expect(mocks.prisma.task.findMany).toHaveBeenCalledOnce();
    expect(mocks.prisma).not.toHaveProperty("taskCategory");
  });

  it("returns no task metrics for an empty task collection", async () => {
    mocks.prisma.task.groupBy.mockResolvedValue([]);
    mocks.prisma.task.findMany.mockResolvedValue([]);

    const result = await dashboardRepository.getDashboardSummary("wedding_1");

    expect(result.taskCount).toBe(0);
    expect(result.completedTaskCount).toBe(0);
    expect(result.upcomingTasks).toEqual([]);
  });

  it("keeps upcoming tasks wedding-scoped and limited to five rows", async () => {
    mocks.prisma.task.findMany.mockImplementation(async (args) => {
      expect(args.where).toEqual({
        weddingId: "wedding_1",
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        dueDate: { not: null },
      });
      expect(args.take).toBe(5);

      return Array.from({ length: 5 }, (_, index) => ({
        id: `task_${index + 1}`,
        title: `Task ${index + 1}`,
        status: "NOT_STARTED",
        priority: "MEDIUM",
        dueDate: new Date(`2026-06-${String(index + 1).padStart(2, "0")}`),
      }));
    });

    const result = await dashboardRepository.getDashboardSummary("wedding_1");

    expect(result.upcomingTasks).toHaveLength(5);
    expect(result.upcomingTasks[0]?.id).toBe("task_1");
  });
});
