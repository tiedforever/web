import type { QueryClient } from "@tanstack/react-query";

import type {
  ChecklistReadData,
  CategoryActionData,
  TaskActionData,
} from "@/src/server/actions/checklist/checklist.actions";
import { weddingQueryKeys } from "@/src/query-keys";

export function invalidateChecklistQuery(
  queryClient: QueryClient,
  weddingId: string,
) {
  return queryClient.invalidateQueries({
    queryKey: weddingQueryKeys.checklist(weddingId),
  });
}

export function invalidateDashboardQuery(
  queryClient: QueryClient,
  weddingId: string,
) {
  return queryClient.invalidateQueries({
    queryKey: weddingQueryKeys.dashboard(weddingId),
  });
}

function updateNestedTask(
  task: TaskActionData,
  taskId: string,
  update: (task: TaskActionData) => TaskActionData,
): TaskActionData {
  if (task.id === taskId) return update(task);

  return {
    ...task,
    children: task.children.map((child) =>
      updateNestedTask(child, taskId, update),
    ),
  };
}

function removeNestedTask(
  task: TaskActionData,
  taskId: string,
): TaskActionData | null {
  if (task.id === taskId) return null;

  return {
    ...task,
    children: task.children
      .map((child) => removeNestedTask(child, taskId))
      .filter((child): child is TaskActionData => child !== null),
  };
}

function sortTasks(tasks: TaskActionData[]) {
  return [...tasks].sort((left, right) => {
    if (left.position !== right.position) {
      return left.position - right.position;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

function syncCategoryCounts(
  categories: ChecklistReadData["categories"],
): ChecklistReadData["categories"] {
  return categories.map(({ category, tasks }) => ({
    category: {
      ...category,
      taskCount: tasks.length,
    },
    tasks,
  }));
}

export function updateChecklistTaskStatus(
  data: ChecklistReadData,
  taskId: string,
  status: string,
): ChecklistReadData {
  const now = new Date().toISOString();
  const completedAt = status === "COMPLETED" ? new Date().toISOString() : null;
  const categories = data.categories.map(({ category, tasks }) => ({
    category,
    tasks: tasks.map((task) =>
      updateNestedTask(task, taskId, (current) => ({
        ...current,
        status,
        completedAt,
        updatedAt: now,
      })),
    ),
  }));

  return { ...data, categories };
}

export function addChecklistTask(
  data: ChecklistReadData,
  task: TaskActionData,
): ChecklistReadData {
  const categories = data.categories.map(({ category, tasks }) =>
    category.id === task.categoryId
      ? { category, tasks: sortTasks([...tasks, task]) }
      : { category, tasks },
  );

  return { ...data, categories: syncCategoryCounts(categories) };
}

export function replaceChecklistTask(
  data: ChecklistReadData,
  task: TaskActionData,
): ChecklistReadData {
  const hasTopLevelTask = data.categories.some(({ tasks }) =>
    tasks.some((current) => current.id === task.id),
  );

  if (!hasTopLevelTask) {
    return {
      ...data,
      categories: data.categories.map(({ category, tasks }) => ({
        category,
        tasks: tasks.map((current) =>
          updateNestedTask(current, task.id, () => task),
        ),
      })),
    };
  }

  const categoriesWithoutTask = data.categories.map(({ category, tasks }) => ({
    category,
    tasks: tasks.filter((current) => current.id !== task.id),
  }));
  const categories = categoriesWithoutTask.map(({ category, tasks }) =>
    category.id === task.categoryId
      ? { category, tasks: sortTasks([...tasks, task]) }
      : { category, tasks },
  );

  return { ...data, categories: syncCategoryCounts(categories) };
}

export function removeChecklistTask(
  data: ChecklistReadData,
  taskId: string,
): ChecklistReadData {
  const categories = data.categories.map(({ category, tasks }) => ({
    category,
    tasks: tasks
      .map((task) => removeNestedTask(task, taskId))
      .filter((task): task is TaskActionData => task !== null),
  }));

  return { ...data, categories: syncCategoryCounts(categories) };
}

export function addChecklistCategory(
  data: ChecklistReadData,
  category: CategoryActionData,
): ChecklistReadData {
  return {
    ...data,
    categories: [...data.categories, { category, tasks: [] }].sort(
      (left, right) => {
        if (left.category.position !== right.category.position) {
          return left.category.position - right.category.position;
        }

        return left.category.createdAt.localeCompare(right.category.createdAt);
      },
    ),
  };
}

export function replaceChecklistCategory(
  data: ChecklistReadData,
  category: CategoryActionData,
): ChecklistReadData {
  return {
    ...data,
    categories: data.categories.map((current) =>
      current.category.id === category.id
        ? { ...current, category }
        : current,
    ),
  };
}

export function removeChecklistCategory(
  data: ChecklistReadData,
  categoryId: string,
): ChecklistReadData {
  return {
    ...data,
    categories: data.categories.filter(
      ({ category }) => category.id !== categoryId,
    ),
  };
}
