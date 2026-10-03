import "server-only";

import { TaskStatus } from "../../../app/generated/prisma/client";
import { prisma } from "../db/prisma";
import { logger } from "../logging/logger";
import { measurePerformance } from "../logging/performance";

export type DashboardTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date;
};

export type DashboardSummary = {
  guestCount: number;
  unassignedGuestCount: number;
  householdCount: number;
  taskCount: number;
  completedTaskCount: number;
  upcomingTasks: DashboardTask[];
};

export class DashboardRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DashboardRepositoryError";
  }
}

export class DashboardRepository {
  async getDashboardSummary(weddingId: string): Promise<DashboardSummary> {
    return measurePerformance("dashboard.repository.total", async () => {
      try {
        const [
          guestCounts,
          householdCount,
          taskCounts,
          upcomingTaskRecords,
        ] = await Promise.all([
          measurePerformance("dashboard.guests", () =>
            prisma.guest.groupBy({
              by: ["householdId"],
              where: { weddingId },
              _count: { _all: true },
            }),
          ),
          measurePerformance("dashboard.households", () =>
            prisma.household.count({
              where: { weddingId },
            }),
          ),
          measurePerformance("dashboard.taskAggregate", () =>
            prisma.task.groupBy({
              by: ["status"],
              where: { weddingId },
              _count: { _all: true },
            }),
          ),
          measurePerformance("dashboard.upcomingTasks", () =>
            prisma.task.findMany({
              where: {
                weddingId,
                status: {
                  notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
                },
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
            }),
          ),
        ]);

        const guestCount = guestCounts.reduce(
          (total, group) => total + group._count._all,
          0,
        );
        const unassignedGuestCount =
          guestCounts.find((group) => group.householdId === null)?._count._all ?? 0;
        const taskCount = taskCounts.reduce(
          (total, group) => total + group._count._all,
          0,
        );
        const completedTaskCount =
          taskCounts.find((group) => group.status === TaskStatus.COMPLETED)?._count
            ._all ?? 0;
        const upcomingTasks = upcomingTaskRecords.filter(
          (task): task is typeof task & { dueDate: Date } => task.dueDate !== null,
        );

        return {
          guestCount,
          unassignedGuestCount,
          householdCount,
          taskCount,
          completedTaskCount,
          upcomingTasks,
        };
      } catch (error) {
        logger.error("[dashboard-repository] load summary failed", error);
        throw new DashboardRepositoryError("Unable to load dashboard summary");
      }
    });
  }
}

export const dashboardRepository = new DashboardRepository();
