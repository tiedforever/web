"use server";

import { ActiveWeddingRequiredError } from "../../auth/get-active-wedding";
import { AuthenticationRequiredError } from "../../auth/get-authenticated-user";
import { PermissionDeniedError, requireRole } from "../../auth/authorization";
import { logger } from "../../logging/logger";
import {
  dashboardRepository,
  DashboardRepositoryError,
} from "../../repositories/dashboard.repository";
import type { DashboardQueryData } from "../../../types/dashboard";

export type DashboardActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function failure<T = never>(error: string): DashboardActionResult<T> {
  return { success: false, error };
}

export async function getDashboardData(): Promise<
  DashboardActionResult<DashboardQueryData>
> {
  try {
    const context = await requireRole(
      ["OWNER", "EDITOR", "VIEWER"],
      { redirectToOnboarding: false },
    );
    const summary = await dashboardRepository.getDashboardSummary(
      context.wedding.id,
    );

    return {
      success: true,
      data: {
        guestCount: summary.guestCount,
        unassignedGuestCount: summary.unassignedGuestCount,
        householdCount: summary.householdCount,
        taskCount: summary.taskCount,
        completedTaskCount: summary.completedTaskCount,
        upcomingTasks: summary.upcomingTasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate.toISOString(),
        })),
      },
    };
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return failure("Authentication is required.");
    }
    if (error instanceof ActiveWeddingRequiredError) {
      return failure("Create or select a wedding before viewing the dashboard.");
    }
    if (error instanceof PermissionDeniedError) {
      return failure(error.message);
    }
    if (error instanceof DashboardRepositoryError) {
      return failure(error.message);
    }

    logger.error("[dashboard] read action failed", error);
    return failure("Unable to load the dashboard right now.");
  }
}
