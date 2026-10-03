import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  getTask: vi.fn(),
  getTasksForWedding: vi.fn(),
  getCategories: vi.fn(),
  getActiveWeddingMembers: vi.fn(),
  getCategory: vi.fn(),
  getWeddingMember: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  completeTask: vi.fn(),
  reopenTask: vi.fn(),
  revalidatePath: vi.fn(),
  ChecklistRepositoryError: class ChecklistRepositoryError extends Error {},
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("../src/server/auth/authorization", () => ({
  PermissionDeniedError: class PermissionDeniedError extends Error {
    constructor() {
      super("You do not have permission to perform this action.");
      this.name = "PermissionDeniedError";
    }
  },
  requireRole: mocks.requireRole,
}));
vi.mock("../src/server/auth/get-active-wedding", () => ({
  ActiveWeddingRequiredError: class ActiveWeddingRequiredError extends Error {},
}));
vi.mock("../src/server/auth/get-authenticated-user", () => ({
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
}));
vi.mock("../src/server/logging/logger", () => ({
  logger: { error: vi.fn() },
}));
vi.mock("../src/server/repositories/checklist.repository", () => ({
  ChecklistRepositoryError: mocks.ChecklistRepositoryError,
  checklistRepository: {
    getTask: mocks.getTask,
    getTasksForWedding: mocks.getTasksForWedding,
    getCategories: mocks.getCategories,
    getActiveWeddingMembers: mocks.getActiveWeddingMembers,
    getCategory: mocks.getCategory,
    getWeddingMember: mocks.getWeddingMember,
    updateTask: mocks.updateTask,
    deleteTask: mocks.deleteTask,
    completeTask: mocks.completeTask,
    reopenTask: mocks.reopenTask,
  },
}));

import { PermissionDeniedError } from "../src/server/auth/authorization";
import {
  completeTask,
  deleteTask,
  getChecklistData,
  getTasksForWedding,
  reopenTask,
  updateTask,
} from "../src/server/actions/checklist/checklist.actions";

const task = {
  id: "task_1",
  weddingId: "wedding_1",
  categoryId: "category_1",
  assigneeId: null,
  parentTaskId: null,
  title: "Book photographer",
  description: "Confirm the date",
  status: "NOT_STARTED",
  priority: "MEDIUM",
  dueDate: null,
  completedAt: null,
  position: 0,
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-08-01T00:00:00.000Z"),
  assignee: null,
  recurrence: null,
  links: [],
  childTasks: [],
  category: {
    id: "category_1",
    weddingId: "wedding_1",
    name: "Planning",
    icon: null,
    colour: null,
    position: 0,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-01T00:00:00.000Z"),
  },
  parentTask: null,
};

describe("checklist task actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({
      role: "EDITOR",
      wedding: { id: "wedding_1" },
    });
    mocks.getTask.mockResolvedValue(task);
    mocks.getTasksForWedding.mockResolvedValue([task]);
    mocks.getCategories.mockResolvedValue([{
      ...task.category,
      _count: { tasks: 1 },
    }]);
    mocks.getActiveWeddingMembers.mockResolvedValue([]);
    mocks.getCategory.mockResolvedValue(task.category);
    mocks.getWeddingMember.mockResolvedValue({
      id: "member_1",
      weddingId: "wedding_1",
      status: "ACTIVE",
    });
    mocks.updateTask.mockResolvedValue(task);
    mocks.deleteTask.mockResolvedValue(task);
    mocks.completeTask.mockResolvedValue(task);
    mocks.reopenTask.mockResolvedValue(task);
  });

  it("passes the supported edit fields to the update action", async () => {
    const result = await updateTask("task_1", {
      assigneeId: "member_1",
      categoryId: "category_1",
      description: "Confirm the date and package",
      dueDate: "2026-09-12",
      priority: "HIGH",
      status: "IN_PROGRESS",
      title: "Book the photographer",
    });

    expect(result.success).toBe(true);
    expect(mocks.updateTask).toHaveBeenCalledWith("task_1", {
      assigneeId: "member_1",
      categoryId: "category_1",
      description: "Confirm the date and package",
      dueDate: expect.any(Date),
      priority: "HIGH",
      status: "IN_PROGRESS",
      title: "Book the photographer",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/checklist");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("loads checklist tasks through the active wedding scope", async () => {
    const result = await getTasksForWedding();

    expect(result).toMatchObject({
      success: true,
      data: [expect.objectContaining({
        id: "task_1",
        weddingId: "wedding_1",
        categoryId: "category_1",
      })],
    });
    expect(mocks.getTasksForWedding).toHaveBeenCalledWith("wedding_1");
  });

  it("loads categories, members, and tasks in the single wedding-scoped checklist read", async () => {
    const result = await getChecklistData();

    expect(result).toMatchObject({
      success: true,
      data: {
        categories: [{
          category: { id: "category_1", weddingId: "wedding_1" },
          tasks: [{ id: "task_1", weddingId: "wedding_1" }],
        }],
        members: [],
      },
    });
    expect(mocks.getCategories).toHaveBeenCalledWith("wedding_1");
    expect(mocks.getActiveWeddingMembers).toHaveBeenCalledWith("wedding_1");
    expect(mocks.getTasksForWedding).toHaveBeenCalledWith("wedding_1");
  });

  it("deletes a task only after the server action authorization check", async () => {
    const result = await deleteTask("task_1");

    expect(result.success).toBe(true);
    expect(mocks.deleteTask).toHaveBeenCalledWith("task_1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/checklist");
  });

  it("keeps complete and reopen behavior available", async () => {
    await completeTask("task_1");
    await reopenTask("task_1");

    expect(mocks.completeTask).toHaveBeenCalledWith("task_1");
    expect(mocks.reopenTask).toHaveBeenCalledWith("task_1");
  });

  it("rejects update and delete for VIEWER users", async () => {
    mocks.requireRole.mockRejectedValue(new PermissionDeniedError());

    const updateResult = await updateTask("task_1", { title: "No access" });
    const deleteResult = await deleteTask("task_1");

    expect(updateResult.success).toBe(false);
    expect(deleteResult.success).toBe(false);
    expect(mocks.updateTask).not.toHaveBeenCalled();
    expect(mocks.deleteTask).not.toHaveBeenCalled();
  });

  it("returns a safe error when updating or deleting fails", async () => {
    mocks.updateTask.mockRejectedValue(
      new mocks.ChecklistRepositoryError("Failed to update task"),
    );
    const updateResult = await updateTask("task_1", { title: "Updated" });

    mocks.deleteTask.mockRejectedValue(
      new mocks.ChecklistRepositoryError("Failed to delete task"),
    );
    const deleteResult = await deleteTask("task_1");

    expect(updateResult).toEqual({
      success: false,
      error: "Failed to update task",
    });
    expect(deleteResult).toEqual({
      success: false,
      error: "Failed to delete task",
    });
  });
});
