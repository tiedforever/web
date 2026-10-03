import { beforeEach, describe, expect, it, vi } from "vitest";

const snapshot = {
  user: {
    id: "user_1",
    authProviderId: "clerk_1",
    email: "person@example.com",
    firstName: "Person",
    lastName: "Example",
    profileImageUrl: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  preference: {
    id: "preference_1",
    userId: "user_1",
    activeWeddingId: "wedding_1",
    theme: "light",
    timezone: "Europe/London",
    emailNotificationsEnabled: true,
    taskNotificationsEnabled: true,
    paymentNotificationsEnabled: false,
    additionalPreferences: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  memberships: [
    {
      id: "membership_1",
      weddingId: "wedding_1",
      userId: "user_1",
      role: "EDITOR",
      status: "ACTIVE",
      joinedAt: new Date("2026-01-01T00:00:00.000Z"),
      leftAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  ],
  sentMemberInvitations: [
    {
      id: "invitation_1",
      weddingId: "wedding_1",
      invitedEmail: "invitee@example.com",
      role: "EDITOR",
      status: "PENDING",
      tokenHash: "token-hash",
      expiresAt: new Date("2026-02-01T00:00:00.000Z"),
      invitedByUserId: "user_1",
      acceptedByUserId: null,
      acceptedAt: null,
      revokedAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  ],
  acceptedMemberInvitationIds: ["accepted_invitation_1"],
  assignedTasks: [{ id: "task_1", assigneeId: "membership_1" }],
};

const mocks = vi.hoisted(() => ({
  clerkUserDelete: vi.fn(),
  clerkClient: vi.fn(),
  prisma: {
    $transaction: vi.fn(),
  },
  tx: {
    user: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
    },
    userPreference: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    weddingMember: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    weddingInvitation: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
    },
    task: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: mocks.clerkClient,
}));
vi.mock("../src/server/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("../src/server/logging/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

import {
  accountDeletionService,
  AccountDeletionServiceError,
} from "../src/server/services/account-deletion.service";

describe("accountDeletionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation(async (callback) =>
      callback(mocks.tx),
    );
    mocks.tx.user.findUnique.mockResolvedValue(snapshot.user);
    mocks.tx.weddingMember.findFirst.mockResolvedValue(null);
    mocks.tx.weddingMember.findMany.mockResolvedValue(snapshot.memberships);
    mocks.tx.userPreference.findUnique.mockResolvedValue(snapshot.preference);
    mocks.tx.weddingInvitation.findMany
      .mockResolvedValueOnce(snapshot.sentMemberInvitations)
      .mockResolvedValueOnce(
        snapshot.acceptedMemberInvitationIds.map((id) => ({ id })),
      );
    mocks.tx.task.findMany.mockResolvedValue(snapshot.assignedTasks);
    mocks.tx.weddingInvitation.deleteMany.mockResolvedValue({ count: 1 });
    mocks.tx.weddingMember.deleteMany.mockResolvedValue({ count: 1 });
    mocks.tx.user.delete.mockResolvedValue({ id: "user_1" });
    mocks.tx.user.create.mockResolvedValue(snapshot.user);
    mocks.tx.userPreference.create.mockResolvedValue(snapshot.preference);
    mocks.tx.weddingMember.createMany.mockResolvedValue({ count: 1 });
    mocks.tx.weddingInvitation.createMany.mockResolvedValue({ count: 1 });
    mocks.tx.weddingInvitation.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.task.updateMany.mockResolvedValue({ count: 1 });
    mocks.clerkUserDelete.mockResolvedValue({ id: "clerk_1", object: "user" });
    mocks.clerkClient.mockResolvedValue({
      users: { deleteUser: mocks.clerkUserDelete },
    });
  });

  it("commits local deletion before deleting the Clerk user", async () => {
    const order: string[] = [];
    mocks.prisma.$transaction.mockImplementation(async (callback) => {
      order.push("transaction started");
      const result = await callback(mocks.tx);
      order.push("transaction committed");
      return result;
    });
    mocks.clerkUserDelete.mockImplementation(async () => {
      order.push("clerk");
      return { id: "clerk_1", object: "user" };
    });

    await accountDeletionService.deleteAccount({
      userId: "user_1",
      clerkUserId: "clerk_1",
    });

    expect(order).toEqual([
      "transaction started",
      "transaction committed",
      "clerk",
    ]);
    expect(mocks.prisma.$transaction).toHaveBeenCalledOnce();
    expect(mocks.tx.weddingInvitation.deleteMany).toHaveBeenCalledWith({
      where: { invitedByUserId: "user_1" },
    });
    expect(mocks.tx.weddingMember.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
    });
    expect(mocks.tx.user.delete).toHaveBeenCalledWith({
      where: { id: "user_1" },
    });
    expect(mocks.clerkUserDelete).toHaveBeenCalledWith("clerk_1");
  });

  it("does not call Clerk when local database deletion fails", async () => {
    mocks.prisma.$transaction.mockRejectedValue(new Error("database offline"));

    await expect(
      accountDeletionService.deleteAccount({
        userId: "user_1",
        clerkUserId: "clerk_1",
      }),
    ).rejects.toThrow("Unable to delete your account. Please try again.");

    expect(mocks.clerkUserDelete).not.toHaveBeenCalled();
    expect(mocks.prisma.$transaction).toHaveBeenCalledOnce();
  });

  it("blocks deletion when any wedding would lose its last active owner", async () => {
    mocks.tx.weddingMember.findFirst.mockResolvedValue({ id: "owner_membership" });

    await expect(
      accountDeletionService.deleteAccount({
        userId: "user_1",
        clerkUserId: "clerk_1",
      }),
    ).rejects.toThrow(
      "You are the only active owner of at least one wedding.",
    );

    expect(mocks.tx.weddingInvitation.deleteMany).not.toHaveBeenCalled();
    expect(mocks.tx.weddingMember.deleteMany).not.toHaveBeenCalled();
    expect(mocks.tx.user.delete).not.toHaveBeenCalled();
    expect(mocks.clerkUserDelete).not.toHaveBeenCalled();
  });

  it("allows an owner to delete their account when another active owner remains", async () => {
    mocks.tx.weddingMember.findMany.mockResolvedValue([
      { ...snapshot.memberships[0], role: "OWNER" },
    ]);
    await accountDeletionService.deleteAccount({ userId: "user_1", clerkUserId: "clerk_1" });

    expect(mocks.tx.weddingMember.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        role: "OWNER",
        status: "ACTIVE",
        wedding: { members: { none: { userId: { not: "user_1" }, role: "OWNER", status: "ACTIVE" } } },
      },
      select: { id: true },
    });
    expect(mocks.tx.user.delete).toHaveBeenCalledWith({ where: { id: "user_1" } });
    expect(mocks.clerkUserDelete).toHaveBeenCalledWith("clerk_1");
    expect(mocks.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  });

  it("does not delete the Clerk account when concurrent owner deletion aborts the transaction", async () => {
    mocks.prisma.$transaction.mockRejectedValue(Object.assign(new Error("Write conflict"), { code: "P2034" }));
    await expect(accountDeletionService.deleteAccount({ userId: "user_1", clerkUserId: "clerk_1" })).rejects.toThrow("Unable to delete your account. Please try again.");
    expect(mocks.clerkUserDelete).not.toHaveBeenCalled();
  });

  it("rejects a mismatched local Clerk identity", async () => {
    mocks.tx.user.findUnique.mockResolvedValue({
      ...snapshot.user,
      authProviderId: "another_clerk_user",
    });

    await expect(
      accountDeletionService.deleteAccount({
        userId: "user_1",
        clerkUserId: "clerk_1",
      }),
    ).rejects.toThrow(AccountDeletionServiceError);

    expect(mocks.tx.user.delete).not.toHaveBeenCalled();
    expect(mocks.clerkUserDelete).not.toHaveBeenCalled();
  });

  it("restores the local account when Clerk deletion fails after commit", async () => {
    mocks.clerkUserDelete.mockRejectedValue(new Error("Clerk unavailable"));

    await expect(
      accountDeletionService.deleteAccount({
        userId: "user_1",
        clerkUserId: "clerk_1",
      }),
    ).rejects.toThrow(
      "Your application account was restored, so you can safely try again later.",
    );

    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(mocks.tx.user.create).toHaveBeenCalledWith({ data: snapshot.user });
    expect(mocks.tx.weddingMember.createMany).toHaveBeenCalledWith({
      data: snapshot.memberships,
    });
    expect(mocks.tx.weddingInvitation.createMany).toHaveBeenCalledWith({
      data: snapshot.sentMemberInvitations,
    });
    expect(mocks.tx.userPreference.create).toHaveBeenCalled();
    expect(mocks.tx.weddingInvitation.updateMany).toHaveBeenCalledWith({
      where: { id: { in: snapshot.acceptedMemberInvitationIds } },
      data: { acceptedByUserId: "user_1" },
    });
    expect(mocks.tx.task.updateMany).toHaveBeenCalledWith({
      where: { id: "task_1" },
      data: { assigneeId: "membership_1" },
    });
  });

  it("returns a support-style error when local recovery also fails", async () => {
    mocks.clerkUserDelete.mockRejectedValue(new Error("Clerk unavailable"));
    mocks.tx.user.create.mockRejectedValue(new Error("database unavailable"));

    await expect(
      accountDeletionService.deleteAccount({
        userId: "user_1",
        clerkUserId: "clerk_1",
      }),
    ).rejects.toThrow(
      "We couldn't complete account deletion safely. Please contact support before trying again.",
    );

    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(2);
  });
});
