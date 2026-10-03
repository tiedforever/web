import "server-only";

import type { Prisma } from "../../../app/generated/prisma/client";
import {
  MembershipStatus,
  TaskPriority,
  TaskRecurrenceFrequency,
  TaskStatus,
} from "../../../app/generated/prisma/client";
import { prisma } from "../db/prisma";

const taskLinksOrderBy = [
  { position: "asc" as const },
  { createdAt: "asc" as const },
];

const childTaskInclude = {
  assignee: {
    include: {
      user: true,
    },
  },
  recurrence: true,
  links: {
    orderBy: taskLinksOrderBy,
  },
} satisfies Prisma.TaskInclude;

const taskListInclude = {
  assignee: {
    include: {
      user: true,
    },
  },
  recurrence: true,
  links: {
    orderBy: taskLinksOrderBy,
  },
  childTasks: {
    orderBy: [{ position: "asc" as const }, { createdAt: "asc" as const }],
    include: childTaskInclude,
  },
} satisfies Prisma.TaskInclude;

const taskDetailInclude = {
  wedding: true,
  category: true,
  parentTask: true,
  ...taskListInclude,
} satisfies Prisma.TaskInclude;

const categoryInclude = {
  _count: {
    select: {
      tasks: true,
    },
  },
} satisfies Prisma.TaskCategoryInclude;

export type CreateCategoryInput = {
  weddingId: string;
  name: string;
  icon?: string | null;
  colour?: string | null;
  position?: number;
};

export type UpdateCategoryInput = {
  name?: string;
  icon?: string | null;
  colour?: string | null;
  position?: number;
};

export type TaskLinkInput = {
  label?: string | null;
  url: string;
  position?: number;
};

export type TaskRecurrenceInput = {
  frequency: TaskRecurrenceFrequency;
  interval?: number;
  startsOn?: Date | null;
  endsOn?: Date | null;
  nextOccurrenceAt?: Date | null;
};

export type CreateTaskInput = {
  weddingId: string;
  categoryId: string;
  assigneeId?: string | null;
  parentTaskId?: string | null;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
  completedAt?: Date | null;
  position?: number;
  links?: readonly TaskLinkInput[];
  recurrence?: TaskRecurrenceInput | null;
};

export type UpdateTaskInput = {
  categoryId?: string;
  assigneeId?: string | null;
  parentTaskId?: string | null;
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
  completedAt?: Date | null;
  position?: number;
  links?: readonly TaskLinkInput[];
  recurrence?: TaskRecurrenceInput | null;
};

export type PositionUpdate = {
  id: string;
  position: number;
};

type TaskParentRecord = {
  id: string;
  weddingId: string;
  parentTaskId: string | null;
};

export class ChecklistRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChecklistRepositoryError";
  }
}

export class ChecklistRepository {
  async getCategories(weddingId: string) {
    return this.execute("load categories", () =>
      prisma.taskCategory.findMany({
        where: { weddingId },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: categoryInclude,
      }),
    );
  }

  async getCategory(id: string) {
    return this.execute("load category", async () => {
      const category = await prisma.taskCategory.findUnique({
        where: { id },
        include: categoryInclude,
      });

      if (!category) {
        throw new ChecklistRepositoryError("Category not found");
      }

      return category;
    });
  }

  async categoryNameExists(
    weddingId: string,
    name: string,
    excludeId?: string,
  ) {
    return this.execute("check category name", async () => {
      const category = await prisma.taskCategory.findFirst({
        where: {
          weddingId,
          name: { equals: name, mode: "insensitive" },
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
      });

      return category !== null;
    });
  }

  async getTasks(categoryId: string) {
    return this.execute("load tasks", async () => {
      const category = await prisma.taskCategory.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });

      if (!category) {
        throw new ChecklistRepositoryError("Category not found");
      }

      return prisma.task.findMany({
        where: { categoryId },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: taskListInclude,
      });
    });
  }

  async getTasksForWedding(weddingId: string) {
    return this.execute("load wedding tasks", () =>
      prisma.task.findMany({
        where: {
          weddingId,
          category: { weddingId },
        },
        orderBy: [
          { categoryId: "asc" },
          { position: "asc" },
          { createdAt: "asc" },
        ],
        include: taskListInclude,
      }),
    );
  }

  async getTask(id: string) {
    return this.execute("load task", async () => {
      const task = await prisma.task.findUnique({
        where: { id },
        include: taskDetailInclude,
      });

      if (!task) {
        throw new ChecklistRepositoryError("Task not found");
      }

      return task;
    });
  }

  async getWeddingMember(id: string) {
    return this.execute("load wedding member", async () => {
      const member = await this.findWeddingMember(id);

      if (!member) {
        throw new ChecklistRepositoryError("Wedding member not found");
      }

      return member;
    });
  }

  async findWeddingMember(id: string) {
    return this.execute("find wedding member", () =>
      prisma.weddingMember.findUnique({
        where: { id },
        select: { id: true, weddingId: true, status: true },
      }),
    );
  }

  async getActiveWeddingMembers(weddingId: string) {
    return this.execute("load active wedding members", () =>
      prisma.weddingMember.findMany({
        where: {
          weddingId,
          status: MembershipStatus.ACTIVE,
        },
        select: {
          id: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImageUrl: true,
            },
          },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
    );
  }

  async findTaskParentChain(id: string) {
    return this.execute("find task parent chain", async () => {
      const chain: TaskParentRecord[] = [];
      const visited = new Set<string>();
      let currentId: string | null = id;

      while (currentId !== null) {
        if (visited.has(currentId)) {
          return { chain, hasCycle: true };
        }

        visited.add(currentId);

        const task: TaskParentRecord | null = await prisma.task.findUnique({
          where: { id: currentId },
          select: { id: true, weddingId: true, parentTaskId: true },
        });

        if (!task) {
          return null;
        }

        chain.push(task);
        currentId = task.parentTaskId;
      }

      return { chain, hasCycle: false };
    });
  }

  async createCategory(input: CreateCategoryInput) {
    return this.execute("create category", () =>
      prisma.taskCategory.create({
        data: {
          weddingId: input.weddingId,
          name: input.name,
          icon: input.icon ?? null,
          colour: input.colour ?? null,
          position: input.position ?? 0,
        },
        include: categoryInclude,
      }),
    );
  }

  async createTask(input: CreateTaskInput) {
    return this.execute("create task", () =>
      prisma.$transaction(async (tx) => {
        const task = await tx.task.create({
          data: {
            weddingId: input.weddingId,
            categoryId: input.categoryId,
            assigneeId: input.assigneeId ?? null,
            parentTaskId: input.parentTaskId ?? null,
            title: input.title,
            description: input.description ?? null,
            status: input.status ?? TaskStatus.NOT_STARTED,
            priority: input.priority ?? TaskPriority.MEDIUM,
            dueDate: input.dueDate ?? null,
            completedAt: input.completedAt ?? null,
            position: input.position ?? 0,
          },
        });

        if (input.links && input.links.length > 0) {
          await tx.taskLink.createMany({
            data: input.links.map((link) => ({
              taskId: task.id,
              label: link.label ?? null,
              url: link.url,
              position: link.position ?? 0,
            })),
          });
        }

        if (input.recurrence) {
          await tx.taskRecurrence.create({
            data: {
              taskId: task.id,
              frequency: input.recurrence.frequency,
              interval: input.recurrence.interval ?? 1,
              startsOn: input.recurrence.startsOn ?? null,
              endsOn: input.recurrence.endsOn ?? null,
              nextOccurrenceAt: input.recurrence.nextOccurrenceAt ?? null,
            },
          });
        }

        return tx.task.findUniqueOrThrow({
          where: { id: task.id },
          include: taskDetailInclude,
        });
      }),
    );
  }

  async updateCategory(id: string, input: UpdateCategoryInput) {
    const data: Prisma.TaskCategoryUncheckedUpdateInput = {};

    if (input.name !== undefined) data.name = input.name;
    if (input.icon !== undefined) data.icon = input.icon;
    if (input.colour !== undefined) data.colour = input.colour;
    if (input.position !== undefined) data.position = input.position;

    return this.execute("update category", () =>
      prisma.taskCategory.update({
        where: { id },
        data,
        include: categoryInclude,
      }),
    );
  }

  async updateTask(id: string, input: UpdateTaskInput) {
    const data: Prisma.TaskUncheckedUpdateInput = {};

    if (input.categoryId !== undefined) data.categoryId = input.categoryId;
    if (input.assigneeId !== undefined) data.assigneeId = input.assigneeId;
    if (input.parentTaskId !== undefined) {
      data.parentTaskId = input.parentTaskId;
    }
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) data.status = input.status;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.dueDate !== undefined) data.dueDate = input.dueDate;
    if (input.completedAt !== undefined) data.completedAt = input.completedAt;
    if (input.position !== undefined) data.position = input.position;

    return this.execute("update task", () =>
      prisma.$transaction(async (tx) => {
        await tx.task.update({ where: { id }, data });

        if (input.links !== undefined) {
          await tx.taskLink.deleteMany({ where: { taskId: id } });

          if (input.links.length > 0) {
            await tx.taskLink.createMany({
              data: input.links.map((link) => ({
                taskId: id,
                label: link.label ?? null,
                url: link.url,
                position: link.position ?? 0,
              })),
            });
          }
        }

        if (input.recurrence !== undefined) {
          if (input.recurrence === null) {
            await tx.taskRecurrence.deleteMany({ where: { taskId: id } });
          } else {
            await tx.taskRecurrence.upsert({
              where: { taskId: id },
              update: {
                frequency: input.recurrence.frequency,
                interval: input.recurrence.interval ?? 1,
                startsOn: input.recurrence.startsOn ?? null,
                endsOn: input.recurrence.endsOn ?? null,
                nextOccurrenceAt: input.recurrence.nextOccurrenceAt ?? null,
              },
              create: {
                taskId: id,
                frequency: input.recurrence.frequency,
                interval: input.recurrence.interval ?? 1,
                startsOn: input.recurrence.startsOn ?? null,
                endsOn: input.recurrence.endsOn ?? null,
                nextOccurrenceAt: input.recurrence.nextOccurrenceAt ?? null,
              },
            });
          }
        }

        return tx.task.findUniqueOrThrow({
          where: { id },
          include: taskDetailInclude,
        });
      }),
    );
  }

  async deleteCategory(id: string) {
    return this.execute("delete category", () =>
      prisma.$transaction(async (tx) => {
        const category = await tx.taskCategory.findUnique({
          where: { id },
          select: { id: true },
        });

        if (!category) {
          throw new ChecklistRepositoryError("Category not found");
        }

        await tx.task.deleteMany({
          where: { categoryId: id },
        });

        return tx.taskCategory.delete({
          where: { id },
          include: categoryInclude,
        });
      }),
    );
  }

  async deleteTask(id: string) {
    return this.execute("delete task", () =>
      prisma.$transaction((tx) =>
        tx.task.delete({
          where: { id },
          include: taskDetailInclude,
        }),
      ),
    );
  }

  async completeTask(id: string) {
    return this.execute("complete task", () =>
      prisma.task.update({
        where: { id },
        data: {
          status: TaskStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: taskDetailInclude,
      }),
    );
  }

  async reopenTask(id: string) {
    return this.execute("reopen task", () =>
      prisma.task.update({
        where: { id },
        data: {
          status: TaskStatus.NOT_STARTED,
          completedAt: null,
        },
        include: taskDetailInclude,
      }),
    );
  }

  async reorderCategories(
    weddingId: string,
    updates: readonly PositionUpdate[],
  ): Promise<void> {
    await this.execute("reorder categories", () =>
      prisma.$transaction(async (tx) => {
        for (const update of updates) {
          const result = await tx.taskCategory.updateMany({
            where: { id: update.id, weddingId },
            data: { position: update.position },
          });

          if (result.count !== 1) {
            throw new ChecklistRepositoryError("Category not found");
          }
        }
      }),
    );
  }

  async reorderTasks(
    categoryId: string,
    updates: readonly PositionUpdate[],
  ): Promise<void> {
    await this.execute("reorder tasks", () =>
      prisma.$transaction(async (tx) => {
        for (const update of updates) {
          const result = await tx.task.updateMany({
            where: { id: update.id, categoryId },
            data: { position: update.position },
          });

          if (result.count !== 1) {
            throw new ChecklistRepositoryError("Task not found");
          }
        }
      }),
    );
  }

  private async execute<T>(
    operation: string,
    action: () => Promise<T>,
  ): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (error instanceof ChecklistRepositoryError) {
        throw error;
      }

      if (this.isPrismaError(error, "P2002")) {
        throw new ChecklistRepositoryError(
          `Cannot ${operation}: a record with the same unique value already exists`,
        );
      }

      if (this.isPrismaError(error, "P2025")) {
        throw new ChecklistRepositoryError(
          `Cannot ${operation}: the requested record was not found`,
        );
      }

      throw new ChecklistRepositoryError(`Failed to ${operation}`);
    }
  }

  private isPrismaError(error: unknown, code: string): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === code
    );
  }
}

export const checklistRepository = new ChecklistRepository();
