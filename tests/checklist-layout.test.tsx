import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { CategoryActions } from "../src/components/checklist/category-actions";
import { CategorySection } from "../src/components/checklist/category-section";
import { ChecklistPageHeader } from "../src/components/checklist/checklist-page-header";
import {
  filterChecklistCategories,
} from "../src/components/checklist/checklist-browser";
import { ChecklistToolbar } from "../src/components/checklist/checklist-toolbar";
import type {
  CategoryActionData,
  TaskActionData,
} from "../src/server/actions/checklist/checklist.actions";
import type { CategoryViewModel } from "../src/components/checklist/types";

const category: CategoryActionData = {
  id: "category_1",
  weddingId: "wedding_1",
  name: "Planning",
  icon: "checklist",
  colour: null,
  position: 0,
  taskCount: 2,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

function makeTask(
  overrides: Partial<TaskActionData> = {},
): TaskActionData {
  return {
    id: "task_1",
    weddingId: "wedding_1",
    categoryId: category.id,
    assigneeId: null,
    parentTaskId: null,
    title: "Book flowers",
    description: "Confirm the florist",
    status: "NOT_STARTED",
    priority: "HIGH",
    dueDate: null,
    completedAt: null,
    position: 0,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    assignee: null,
    recurrence: null,
    links: [],
    children: [],
    category: null,
    parentTask: null,
    ...overrides,
  };
}

const todoTask = makeTask();
const doneTask = makeTask({
  id: "task_2",
  title: "Send invitations",
  status: "COMPLETED",
  priority: "LOW",
});

const taskAction = async () => ({ success: true as const, data: todoTask });
const categoryAction = async () => ({ success: true as const, data: category });
const categoryDeleteAction = async () => ({
  success: true as const,
  data: category,
});

const categoryViewModel: CategoryViewModel = {
  category,
  categoryOptions: [{ id: category.id, name: category.name }],
  members: [],
  tasks: [
    {
      task: todoTask,
      completeAction: taskAction,
      reopenAction: taskAction,
      updateAction: taskAction,
      deleteAction: taskAction,
    },
    {
      task: doneTask,
      completeAction: taskAction,
      reopenAction: taskAction,
      updateAction: taskAction,
      deleteAction: taskAction,
    },
  ],
  createTaskAction: taskAction,
  updateCategoryAction: categoryAction,
  deleteCategoryAction: categoryDeleteAction,
};

describe("checklist V1 layout controls", () => {
  it("removes the deferred List and Kanban controls from the header", () => {
    const markup = renderToStaticMarkup(
      <ChecklistPageHeader
        canEdit
        createCategoryAction={categoryAction}
        weddingDate="18 September 2026"
        weddingName="Ada & Charles"
      />,
    );

    expect(markup).toContain("Wedding Checklist");
    expect(markup).toContain("Manage categories");
    expect(markup).not.toContain(">List<");
    expect(markup).not.toContain(">Kanban<");
  });

  it("keeps category editing and task creation behind compact category actions", () => {
    const markup = renderToStaticMarkup(
      <CategoryActions
        category={category}
        createTaskAction={taskAction}
        deleteCategoryAction={categoryDeleteAction}
        members={[]}
        updateCategoryAction={categoryAction}
      />,
    );

    expect(markup).toContain("Add task");
    expect(markup).toContain('aria-label="Category actions for Planning"');
    expect(markup).toContain('aria-haspopup="menu"');
    expect(markup).toContain('role="menuitem"');
    expect(markup).toContain("Edit category");
    expect(markup).toContain("Delete category");
  });

  it("does not expose category mutation controls to VIEWER users", () => {
    const markup = renderToStaticMarkup(
      <CategorySection canEdit={false} {...categoryViewModel} />,
    );

    expect(markup).not.toContain("Category actions for Planning");
    expect(markup).not.toContain("Add task");
    expect(markup).not.toContain("Edit category");
    expect(markup).not.toContain("Delete category");
  });

  it("renders enabled search, category, priority, and status controls together", () => {
    const markup = renderToStaticMarkup(
      <ChecklistToolbar
        categories={[{ id: category.id, name: category.name }]}
        categoryId="all"
        completedCount={1}
        incompleteCount={1}
        onCategoryChange={() => undefined}
        onPriorityChange={() => undefined}
        onSearchChange={() => undefined}
        onStatusChange={() => undefined}
        priorities={["High", "Low"]}
        priority="all"
        search=""
        status="all"
        totalCount={2}
      />,
    );

    expect(markup).toContain("Search tasks");
    expect(markup).toContain("All categories");
    expect(markup).toContain("All priorities");
    expect(markup).toContain(">To Do<");
    expect(markup).toContain(">Done<");
    expect(markup).not.toContain("aria-disabled");
    expect(markup).not.toContain("disabled");
  });

  it("filters tasks by search, priority, and completion status", () => {
    expect(
      filterChecklistCategories([categoryViewModel], {
        categoryId: "all",
        priority: "all",
        search: "flowers",
        status: "all",
      })[0]?.tasks.map(({ task }) => task.id),
    ).toEqual(["task_1"]);

    expect(
      filterChecklistCategories([categoryViewModel], {
        categoryId: "all",
        priority: "low",
        search: "",
        status: "done",
      })[0]?.tasks.map(({ task }) => task.id),
    ).toEqual(["task_2"]);
  });
});
