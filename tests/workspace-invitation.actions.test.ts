import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class PermissionDeniedError extends Error {
    constructor() {
      super("You do not have permission to perform this action.");
    }
  }

  return {
    requireOwner: vi.fn(),
    requireActionWedding: vi.fn(),
    createAndSend: vi.fn(),
    list: vi.fn(),
    listActiveMembers: vi.fn(),
    revalidatePath: vi.fn(),
    PermissionDeniedError,
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));
vi.mock("../src/server/auth/get-active-wedding", () => ({
  ActiveWeddingRequiredError: class ActiveWeddingRequiredError extends Error {},
  requireActionWedding: mocks.requireActionWedding,
}));
vi.mock("../src/server/auth/get-authenticated-user", () => ({
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
  getAuthenticatedUser: vi.fn(),
}));
vi.mock("../src/server/auth/authorization", () => ({
  PermissionDeniedError: mocks.PermissionDeniedError,
  requireOwner: mocks.requireOwner,
}));
vi.mock("../src/server/repositories/wedding.repository", () => ({
  WeddingRepositoryError: class WeddingRepositoryError extends Error {},
  weddingRepository: {
    listActiveMembers: mocks.listActiveMembers,
  },
}));
vi.mock("../src/server/services/workspace-invitation.service", () => ({
  WeddingMemberInvitationServiceError: class WeddingMemberInvitationServiceError extends Error {},
  isValidEmail: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
  normalizeEmail: (value: string) => value.trim().toLowerCase(),
  weddingMemberInvitationService: {
    createAndSend: mocks.createAndSend,
    list: mocks.list,
    resend: vi.fn(),
    revoke: vi.fn(),
  },
}));
vi.mock("../src/server/logging/logger", () => ({
  logger: { error: vi.fn() },
}));

import { listWeddingMembers } from "../src/server/actions/wedding/wedding.actions";
import { createWeddingMemberInvitation } from "../src/server/actions/wedding/workspace-invitation.actions";

const ownerContext = {
  user: {
    id: "owner_1",
    email: "owner@example.com",
    firstName: "Owner",
  },
  wedding: { id: "wedding_1", name: "A & B" },
};

describe("workspace invitation actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireOwner.mockResolvedValue(ownerContext);
    mocks.createAndSend.mockResolvedValue({
      memberInvitationId: "invitation_1",
      emailSent: false,
      developmentWorkspaceInvitationUrl: "http://localhost:3000/invitations/accept?token=test",
      message: "The invitation was created.",
    });
    mocks.requireActionWedding.mockResolvedValue({
      wedding: { id: "wedding_1" },
    });
    mocks.listActiveMembers.mockResolvedValue([]);
  });

  it("allows the OWNER to invite another OWNER to the active wedding", async () => {
    await expect(
      createWeddingMemberInvitation({ role: "OWNER", email: " Partner@Example.com " }),
    ).resolves.toEqual({
      success: true,
      data: {
        memberInvitationId: "invitation_1",
        emailSent: false,
        developmentWorkspaceInvitationUrl: "http://localhost:3000/invitations/accept?token=test",
        message: "The invitation was created.",
      },
    });

    expect(mocks.requireOwner).toHaveBeenCalledOnce();
    expect(mocks.createAndSend).toHaveBeenCalledWith({
      weddingId: "wedding_1",
      weddingName: "A & B",
      invitedEmail: "partner@example.com",
      role: "OWNER",
      invitedByUserId: "owner_1",
      inviterFirstName: "Owner",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings/members");
    expect(mocks.revalidatePath).not.toHaveBeenCalledWith("/", "layout");
  });

  it.each(["EDITOR", "VIEWER"])("allows an owner to invite a %s", async (role) => {
    const result = await createWeddingMemberInvitation({ email: "helper@example.com", role });
    expect(result.success).toBe(true);
    expect(mocks.createAndSend).toHaveBeenCalledWith(expect.objectContaining({ role }));
  });

  it.each([undefined, "ADMIN", "owner", null])("rejects an invalid invitation role %s", async (role) => {
    const result = await createWeddingMemberInvitation({ email: "helper@example.com", role });
    expect(result.success).toBe(false);
    expect(mocks.createAndSend).not.toHaveBeenCalled();
  });

  it.each(["EDITOR", "VIEWER"])(
    "%s cannot invite when OWNER permission is denied",
    async () => {
      mocks.requireOwner.mockRejectedValue(
        new mocks.PermissionDeniedError(),
      );

      await expect(
        createWeddingMemberInvitation({ role: "OWNER", email: "partner@example.com" }),
      ).resolves.toEqual({
        success: false,
        error: "You do not have permission to perform this action.",
      });

      expect(mocks.createAndSend).not.toHaveBeenCalled();
    },
  );

  it("lists active members for the current active wedding", async () => {
    mocks.listActiveMembers.mockResolvedValue([
      {
        id: "membership_1",
        role: "OWNER",
        joinedAt: new Date("2026-01-01T00:00:00.000Z"),
        user: {
          id: "owner_1",
          email: "owner@example.com",
          firstName: "Owner",
          lastName: "Example",
          profileImageUrl: null,
        },
      },
    ]);

    await expect(listWeddingMembers()).resolves.toEqual({
      success: true,
      data: [
        {
          id: "membership_1",
          userId: "owner_1",
          email: "owner@example.com",
          firstName: "Owner",
          lastName: "Example",
          profileImageUrl: null,
          role: "OWNER",
          joinedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
  });
});
