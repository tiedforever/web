import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { TaskForm } from "../src/components/checklist/task-form";
import { TaskRow } from "../src/components/checklist/task-row";
import type { TaskActionData } from "../src/server/actions/checklist/checklist.actions";

const task: TaskActionData = {
  id: "task_1",
  weddingId: "wedding_1",
  categoryId: "category_1",
  assigneeId: null,
  parentTaskId: null,
  title: "Book photographer",
  description: "Confirm the date",
  status: "NOT_STARTED",
  priority: "MEDIUM",
  dueDate: "2026-09-12T00:00:00.000Z",
  completedAt: null,
  position: 0,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  assignee: null,
  recurrence: null,
  links: [],
  children: [],
  category: {
    id: "category_1",
    weddingId: "wedding_1",
    name: "Planning",
    icon: null,
    colour: null,
    position: 0,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
  parentTask: null,
};

const action = async () => ({ success: true as const, data: task });

const categories = [
  { id: "category_1", name: "Planning" },
  { id: "category_2", name: "Suppliers" },
];

const members = [
  {
    id: "member_1",
    userId: "user_1",
    firstName: "Ada",
    lastName: "Lovelace",
    profileImageUrl: null,
  },
];

function renderRow(canEdit: boolean, rowTask = task) {
  return renderToStaticMarkup(
    <TaskRow
      canEdit={canEdit}
      categories={categories}
      completeAction={action}
      deleteAction={action}
      members={members}
      reopenAction={action}
      task={rowTask}
      updateAction={action}
    />,
  );
}

describe("checklist task CRUD UI", () => {
  it("shows compact edit and delete controls for OWNER and EDITOR task rows", () => {
    const ownerMarkup = renderRow(true);
    const editorMarkup = renderRow(true);

    for (const markup of [ownerMarkup, editorMarkup]) {
      expect(markup).toContain('aria-label="Task actions for Book photographer"');
      expect(markup).toContain('aria-haspopup="menu"');
      expect(markup).toContain('title="Task actions"');
      expect(markup).toContain("Edit task");
      expect(markup).toContain("Delete task");
    }
  });

  it("does not show edit or delete controls to VIEWER task rows", () => {
    const markup = renderRow(false);

    expect(markup).not.toContain("Edit task");
    expect(markup).not.toContain("Delete task");
    expect(markup).not.toContain("aria-haspopup=\"dialog\"");
  });

  it("renders the supported edit fields and the task confirmation affordance", () => {
    const formMarkup = renderToStaticMarkup(
      <TaskForm
        action={action}
        categories={categories}
        initialValues={task}
        members={members}
        mode="edit"
      />,
    );
    const rowMarkup = renderRow(true);

    expect(formMarkup).toContain("Category");
    expect(formMarkup).toContain("Status");
    expect(formMarkup).toContain("Title");
    expect(formMarkup).toContain("Description");
    expect(formMarkup).toContain("Priority");
    expect(formMarkup).toContain("Due date");
    expect(formMarkup).toContain("Assignee");
    expect(formMarkup).toContain("Save changes");
    expect(rowMarkup).toContain('aria-label="Task actions for Book photographer"');
  });

  it("keeps complete and reopen controls available", () => {
    expect(renderRow(true)).toContain('aria-label="Complete task"');
    expect(
      renderRow(true, { ...task, status: "COMPLETED", completedAt: task.updatedAt }),
    ).toContain('aria-label="Reopen task"');
  });
});
