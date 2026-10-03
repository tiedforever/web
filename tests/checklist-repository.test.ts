import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("../src/server/db/prisma", () => ({
  prisma: {
    task: { findMany: mocks.findMany },
  },
}));

import { ChecklistRepository } from "../src/server/repositories/checklist.repository";

describe("ChecklistRepository bulk reads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([]);
  });

  it("loads only tasks from the authorized wedding in one query", async () => {
    const repository = new ChecklistRepository();

    await expect(repository.getTasksForWedding("wedding_1")).resolves.toEqual([]);

    expect(mocks.findMany).toHaveBeenCalledOnce();
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {
        weddingId: "wedding_1",
        category: { weddingId: "wedding_1" },
      },
      orderBy: [
        { categoryId: "asc" },
        { position: "asc" },
        { createdAt: "asc" },
      ],
      include: expect.objectContaining({
        childTasks: expect.any(Object),
      }),
    });
  });
});
