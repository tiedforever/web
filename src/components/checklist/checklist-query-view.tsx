"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  completeTask,
  createCategory,
  createTask,
  deleteCategory,
  deleteTask,
  reopenTask,
  updateCategory,
  updateTask,
  type ActionResult,
  type ChecklistReadData,
  type CategoryActionData,
  type TaskActionData,
} from "@/src/server/actions/checklist/checklist.actions";
import { checklistQueryOptions } from "@/src/client/query-options";
import { useDelayedLoadingVisible } from "@/src/components/shared/delayed-loading";
import { shouldShowQuerySkeleton } from "@/src/components/shared/loading-skeleton";
import { weddingQueryKeys } from "@/src/query-keys";

import { ChecklistLoadingSkeleton } from "./checklist-loading-skeleton";
import { ChecklistPageHeader } from "./checklist-page-header";
import { ChecklistProgressOverview } from "./checklist-progress-overview";
import { ChecklistBrowser } from "./checklist-browser";
import type {
  CategoryViewModel,
  CreateCategoryAction,
} from "./types";
import {
  addChecklistCategory,
  addChecklistTask,
  removeChecklistCategory,
  removeChecklistTask,
  replaceChecklistCategory,
  replaceChecklistTask,
  invalidateChecklistQuery,
  invalidateDashboardQuery,
  updateChecklistTaskStatus,
} from "./checklist-query-cache";

type ChecklistQueryViewProps = {
  canEdit: boolean;
  weddingDate: string;
  weddingId: string;
  weddingName: string;
  timezone: string;
};

function formatWeddingDate(date: string, timezone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeZone: timezone,
  }).format(new Date(date));
}

function failure<T = never>(error: string): ActionResult<T> {
  return { success: false, error };
}

export function ChecklistQueryView({
  canEdit,
  weddingDate,
  weddingId,
  weddingName,
  timezone,
}: ChecklistQueryViewProps) {
  const queryClient = useQueryClient();
  const checklistKey = weddingQueryKeys.checklist(weddingId);
  const query = useQuery(checklistQueryOptions(weddingId));

  const data = query.data;
  const routeLoadingVisible = useDelayedLoadingVisible();
  const showSkeleton = shouldShowQuerySkeleton({
    hasData: data !== undefined,
    isPending: query.isPending,
    routeLoadingVisible,
  });

  if (!data) {
    if (query.isError) {
      return <ChecklistError onRetry={() => void query.refetch()} />;
    }
    if (showSkeleton) {
      return <ChecklistLoadingSkeleton />;
    }
    return null;
  }

  const allTasks = data.categories.flatMap(({ tasks }) => tasks);
  const completedTaskCount = allTasks.filter(
    (task) => task.status === "COMPLETED",
  ).length;
  const totalTaskCount = allTasks.length;
  const completionPercentage = totalTaskCount
    ? Math.round((completedTaskCount / totalTaskCount) * 100)
    : 0;
  const categoryOptions = data.categories.map(({ category }) => ({
    id: category.id,
    name: category.name,
  }));
  const priorities = Array.from(new Set(allTasks.map((task) => task.priority))).map(
    (priority) =>
      priority
        .toLowerCase()
        .replace(/^./, (character) => character.toUpperCase()),
  );

  function invalidateChecklist() {
    void invalidateChecklistQuery(queryClient, weddingId);
  }

  function invalidateDashboard() {
    void invalidateDashboardQuery(queryClient, weddingId);
  }

  async function runTaskMutation(
    taskId: string,
    action: (id: string) => Promise<ActionResult<TaskActionData>>,
    optimisticStatus?: string,
  ): Promise<ActionResult<TaskActionData>> {
    const previous = queryClient.getQueryData<ChecklistReadData>(checklistKey);

    if (optimisticStatus) {
      queryClient.setQueryData<ChecklistReadData>(
        checklistKey,
        (current) =>
          current
            ? updateChecklistTaskStatus(current, taskId, optimisticStatus)
            : current,
      );
    }

    try {
      const result = await action(taskId);

      if (!result.success) {
        if (previous) queryClient.setQueryData(checklistKey, previous);
        return result;
      }

      queryClient.setQueryData<ChecklistReadData>(checklistKey, (current) =>
        current ? replaceChecklistTask(current, result.data) : current,
      );
      invalidateChecklist();
      invalidateDashboard();
      return result;
    } catch {
      if (previous) queryClient.setQueryData(checklistKey, previous);
      return failure("Unable to update the task. Please try again.");
    }
  }

  async function createTaskForWedding(
    categoryId: string,
    input: unknown,
  ): Promise<ActionResult<TaskActionData>> {
    const result = await createTask({
      ...(typeof input === "object" && input !== null && !Array.isArray(input)
        ? input
        : {}),
      categoryId,
    });

    if (result.success) {
      queryClient.setQueryData<ChecklistReadData>(checklistKey, (current) =>
        current ? addChecklistTask(current, result.data) : current,
      );
      invalidateChecklist();
      invalidateDashboard();
    }

    return result;
  }

  async function updateTaskForWedding(
    taskId: string,
    input: unknown,
  ): Promise<ActionResult<TaskActionData>> {
    const result = await updateTask(taskId, input);

    if (result.success) {
      queryClient.setQueryData<ChecklistReadData>(checklistKey, (current) =>
        current ? replaceChecklistTask(current, result.data) : current,
      );
      invalidateChecklist();
      invalidateDashboard();
    }

    return result;
  }

  async function deleteTaskForWedding(
    taskId: string,
  ): Promise<ActionResult<TaskActionData>> {
    const result = await deleteTask(taskId);

    if (result.success) {
      queryClient.setQueryData<ChecklistReadData>(checklistKey, (current) =>
        current ? removeChecklistTask(current, taskId) : current,
      );
      invalidateChecklist();
      invalidateDashboard();
    }

    return result;
  }

  async function createCategoryForWedding(
    input: unknown,
  ): Promise<ActionResult<CategoryActionData>> {
    const result = await createCategory(input);

    if (result.success) {
      queryClient.setQueryData<ChecklistReadData>(checklistKey, (current) =>
        current ? addChecklistCategory(current, result.data) : current,
      );
      invalidateChecklist();
    }

    return result;
  }

  async function updateCategoryForWedding(
    categoryId: string,
    input: unknown,
  ): Promise<ActionResult<CategoryActionData>> {
    const result = await updateCategory(categoryId, input);

    if (result.success) {
      queryClient.setQueryData<ChecklistReadData>(checklistKey, (current) =>
        current ? replaceChecklistCategory(current, result.data) : current,
      );
      invalidateChecklist();
    }

    return result;
  }

  async function deleteCategoryForWedding(
    categoryId: string,
  ): Promise<ActionResult<CategoryActionData>> {
    const result = await deleteCategory(categoryId);

    if (result.success) {
      queryClient.setQueryData<ChecklistReadData>(checklistKey, (current) =>
        current ? removeChecklistCategory(current, categoryId) : current,
      );
      invalidateChecklist();
      invalidateDashboard();
    }

    return result;
  }

  const categoryViewModels: CategoryViewModel[] = data.categories.map(
    ({ category, tasks }) => {
      const taskViewModels = tasks.map((task) => {
        const taskId = task.id;
        const isCompleted = task.status === "COMPLETED";

        return {
          task,
          completeAction: () =>
            runTaskMutation(
              taskId,
              completeTask,
              isCompleted ? "NOT_STARTED" : "COMPLETED",
            ),
          reopenAction: () => runTaskMutation(taskId, reopenTask, "NOT_STARTED"),
          updateAction: (input: unknown) => updateTaskForWedding(taskId, input),
          deleteAction: () => deleteTaskForWedding(taskId),
        };
      });

      return {
        category,
        categoryOptions,
        members: data.members,
        tasks: taskViewModels,
        createTaskAction: (input: unknown) =>
          createTaskForWedding(category.id, input),
        updateCategoryAction: (input: unknown) =>
          updateCategoryForWedding(category.id, input),
        deleteCategoryAction: () => deleteCategoryForWedding(category.id),
      };
    },
  );

  return (
    <div className="space-y-6">
      <ChecklistPageHeader
        canEdit={canEdit}
        createCategoryAction={createCategoryForWedding as CreateCategoryAction}
        weddingDate={formatWeddingDate(weddingDate, timezone)}
        weddingName={weddingName}
      />
      {query.isError ? (
        <div aria-live="polite" className="flex items-center justify-between gap-3 rounded-lg border border-[#E7C9C5] bg-[#FFF5F3] px-3 py-2 text-xs text-[#9D3F32]">
          <span>Live refresh failed. Showing the last saved checklist.</span>
          <button
            className="font-semibold underline"
            onClick={() => void query.refetch()}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : null}
      <ChecklistProgressOverview
        completedCount={completedTaskCount}
        completionPercentage={completionPercentage}
        totalCount={totalTaskCount}
      />
      <ChecklistBrowser
        canEdit={canEdit}
        categories={categoryViewModels}
        priorities={priorities}
      />
    </div>
  );
}

function ChecklistError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[420px] items-center">
      <section className="w-full rounded-[14px] border border-[#E7C9C5] bg-[#FFF5F3] p-6 text-[#5C211B]">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-red-700">
          Checklist unavailable
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Your checklist is not ready</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-red-900">
          Unable to load the checklist right now. Please try again.
        </p>
        <button
          className="mt-4 rounded-lg bg-[#2D5A27] px-3 py-2 text-sm font-semibold text-white"
          onClick={onRetry}
          type="button"
        >
          Try again
        </button>
      </section>
    </div>
  );
}
