import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: { $transaction: vi.fn() },
  tx: {
    weddingInvitation: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    user: { findUnique: vi.fn() },
    weddingMember: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    userPreference: { upsert: vi.fn() },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("../src/server/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("../src/server/logging/logger", () => ({
  logger: { error: vi.fn() },
}));

import { weddingMemberInvitationRepository } from "../src/server/repositories/workspace-invitation.repository";

const future = new Date(Date.now() + 24 * 60 * 60 * 1000);

function pendingInvitation(overrides: Record<string, unknown> = {}) {
  return {
    weddingId: "wedding_1",
    invitedEmail: "partner@example.com",
    role: "OWNER",
    status: "PENDING",
    expiresAt: future,
    acceptedByUserId: null,
    ...overrides,
  };
}

describe("WeddingMemberInvitationRepository.accept", () => {
  it.each(["EDITOR", "VIEWER"])("creates a %s membership without promoting it to owner", async (role) => {
    mocks.tx.weddingInvitation.findUnique.mockResolvedValue(pendingInvitation({ role }));
    await weddingMemberInvitationRepository.accept({ id: "invitation_1", weddingId: "wedding_1", userId: "user_2" });
    expect(mocks.tx.weddingMember.create).toHaveBeenCalledWith({ data: expect.objectContaining({ role }) });
  });

  it("does not change an existing active owner's role using an older invitation", async () => {
    mocks.tx.weddingInvitation.findUnique.mockResolvedValue(pendingInvitation({ role: "VIEWER" }));
    mocks.tx.weddingMember.findUnique.mockResolvedValue({ id: "membership_1", role: "OWNER", status: "ACTIVE" });
    await weddingMemberInvitationRepository.accept({ id: "invitation_1", weddingId: "wedding_1", userId: "user_2" });
    expect(mocks.tx.weddingMember.update).not.toHaveBeenCalled();
    expect(mocks.tx.weddingMember.create).not.toHaveBeenCalled();
  });

  it("uses the invitation role when reactivating a former member", async () => {
    mocks.tx.weddingInvitation.findUnique.mockResolvedValue(pendingInvitation({ role: "EDITOR" }));
    mocks.tx.weddingMember.findUnique.mockResolvedValue({ id: "membership_1", role: "OWNER", status: "LEFT" });
    await weddingMemberInvitationRepository.accept({ id: "invitation_1", weddingId: "wedding_1", userId: "user_2" });
    expect(mocks.tx.weddingMember.update).toHaveBeenCalledWith({ where: { id: "membership_1" }, data: expect.objectContaining({ role: "EDITOR", status: "ACTIVE" }) });
  });
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation(async (callback) =>
      callback(mocks.tx),
    );
    mocks.tx.weddingInvitation.findUnique.mockResolvedValue(
      pendingInvitation(),
    );
    mocks.tx.user.findUnique.mockResolvedValue({
      email: "partner@example.com",
    });
    mocks.tx.weddingInvitation.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.weddingMember.findUnique.mockResolvedValue(null);
    mocks.tx.weddingMember.create.mockResolvedValue({ id: "membership_1" });
    mocks.tx.weddingMember.update.mockResolvedValue({ id: "membership_1" });
    mocks.tx.userPreference.upsert.mockResolvedValue({ id: "preference_1" });
  });

  it("transactionally creates an ACTIVE OWNER membership and accepts the invitation", async () => {
    await expect(
      weddingMemberInvitationRepository.accept({
        id: "invitation_1",
        weddingId: "wedding_1",
        userId: "user_2",
      }),
    ).resolves.toEqual({ alreadyMember: false, alreadyAccepted: false });

    expect(mocks.prisma.$transaction).toHaveBeenCalledOnce();
    expect(mocks.tx.weddingInvitation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "invitation_1",
          weddingId: "wedding_1",
          status: "PENDING",
        }),
        data: expect.objectContaining({
          status: "ACCEPTED",
          acceptedByUserId: "user_2",
        }),
      }),
    );
    expect(mocks.tx.weddingMember.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        weddingId: "wedding_1",
        userId: "user_2",
        role: "OWNER",
        status: "ACTIVE",
      }),
    });
    expect(mocks.tx.userPreference.upsert).toHaveBeenCalledWith({
      where: { userId: "user_2" },
      create: expect.objectContaining({
        userId: "user_2",
        activeWeddingId: "wedding_1",
      }),
      update: { activeWeddingId: "wedding_1" },
    });
  });

  it("rejects an invitation when the signed-in email does not match", async () => {
    mocks.tx.user.findUnique.mockResolvedValue({ email: "other@example.com" });

    await expect(
      weddingMemberInvitationRepository.accept({
        id: "invitation_1",
        weddingId: "wedding_1",
        userId: "user_2",
      }),
    ).rejects.toMatchObject({
      code: "EMAIL_MISMATCH",
      message: "This workspace invitation belongs to a different verified email address.",
    });

    expect(mocks.tx.weddingInvitation.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.weddingMember.create).not.toHaveBeenCalled();
  });

  it.each([
    ["expired", { expiresAt: new Date(Date.now() - 1000), status: "PENDING" }],
    ["revoked", { expiresAt: future, status: "REVOKED" }],
  ])("rejects a %s invitation", async (_label, overrides) => {
    mocks.tx.weddingInvitation.findUnique.mockResolvedValue(
      pendingInvitation(overrides),
    );

    await expect(
      weddingMemberInvitationRepository.accept({
        id: "invitation_1",
        weddingId: "wedding_1",
        userId: "user_2",
      }),
    ).rejects.toMatchObject({ code: "INVALID" });

    expect(mocks.tx.weddingInvitation.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.weddingMember.create).not.toHaveBeenCalled();
  });

  it("rejects a token used with a different wedding", async () => {
    mocks.tx.weddingInvitation.findUnique.mockResolvedValue(
      pendingInvitation({ weddingId: "another_wedding" }),
    );

    await expect(
      weddingMemberInvitationRepository.accept({
        id: "invitation_1",
        weddingId: "wedding_1",
        userId: "user_2",
      }),
    ).rejects.toMatchObject({ code: "INVALID" });

    expect(mocks.tx.user.findUnique).not.toHaveBeenCalled();
  });

  it("makes duplicate acceptance idempotent for the same user", async () => {
    mocks.tx.weddingInvitation.findUnique.mockResolvedValue(
      pendingInvitation({
        status: "ACCEPTED",
        acceptedByUserId: "user_2",
      }),
    );

    await expect(
      weddingMemberInvitationRepository.accept({
        id: "invitation_1",
        weddingId: "wedding_1",
        userId: "user_2",
      }),
    ).resolves.toEqual({ alreadyMember: true, alreadyAccepted: true });

    expect(mocks.tx.weddingInvitation.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.weddingMember.create).not.toHaveBeenCalled();
  });

  it("does not create placeholder users during acceptance", async () => {
    await weddingMemberInvitationRepository.accept({
      id: "invitation_1",
      weddingId: "wedding_1",
      userId: "user_2",
    });

    expect(mocks.tx.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user_2" },
      select: { email: true },
    });
  });
});
