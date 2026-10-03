import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  repository: {
    findActiveMemberByWeddingAndEmail: vi.fn(),
    findPendingByWeddingAndEmail: vi.fn(),
    create: vi.fn(),
    findByTokenHash: vi.fn(),
    markExpiredIfPending: vi.fn(),
    findForWedding: vi.fn(),
    revokeForWedding: vi.fn(),
    accept: vi.fn(),
  },
  sendEmail: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("../src/server/repositories/workspace-invitation.repository", () => ({
  weddingMemberInvitationRepository: mocks.repository,
  WeddingMemberInvitationAcceptanceError: class WeddingMemberInvitationAcceptanceError extends Error {
    code: "INVALID" | "EMAIL_MISMATCH";

    constructor(message: string, code: "INVALID" | "EMAIL_MISMATCH") {
      super(message);
      this.code = code;
    }
  },
  WeddingMemberInvitationRepositoryError: class WeddingMemberInvitationRepositoryError extends Error {},
}));
vi.mock("../src/server/services/email/workspace-invitation-email.service", () => ({
  sendWeddingMemberInvitationEmail: mocks.sendEmail,
  WeddingMemberInvitationEmailError: class WeddingMemberInvitationEmailError extends Error {},
}));
vi.mock("../src/server/auth/get-authenticated-user", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));
vi.mock("../src/server/logging/logger", () => ({
  logger: { error: vi.fn() },
}));

import { WeddingMemberInvitationEmailError } from "../src/server/services/email/workspace-invitation-email.service";
import {
  WeddingMemberInvitationService,
  WEDDING_MEMBER_INVITATION_EXPIRY_DAYS,
} from "../src/server/services/workspace-invitation.service";

const service = new WeddingMemberInvitationService();
const token = "a".repeat(32);

function pendingInvitation(overrides: Record<string, unknown> = {}) {
  return {
    id: "invitation_1",
    weddingId: "wedding_1",
    invitedEmail: "partner@example.com",
    role: "OWNER",
    status: "PENDING",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    acceptedBy: null,
    ...overrides,
  };
}

describe("WeddingMemberInvitationService", () => {
  it.each(["OWNER", "EDITOR", "VIEWER"] as const)("sends and stores the chosen %s role", async (role) => {
    await service.createAndSend({ role, weddingId: "wedding_1", weddingName: "A & B", invitedEmail: "helper@example.com", invitedByUserId: "owner_1", inviterFirstName: "Owner" });
    expect(mocks.repository.create).toHaveBeenCalledWith(expect.objectContaining({ role }));
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ role }));
  });

  it.each(["EDITOR", "VIEWER"] as const)("preserves the %s role when resending", async (role) => {
    mocks.repository.findForWedding.mockResolvedValue(pendingInvitation({ role }));
    await service.resend({ id: "invitation_1", weddingId: "wedding_1", weddingName: "A & B", invitedByUserId: "owner_1", inviterFirstName: "Owner" });
    expect(mocks.repository.create).toHaveBeenCalledWith(expect.objectContaining({ role }));
  });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("EMAIL_PROVIDER", "development");
    vi.stubEnv("APP_URL", "https://tied-forever.example.com");
    mocks.repository.findActiveMemberByWeddingAndEmail.mockResolvedValue(null);
    mocks.repository.findPendingByWeddingAndEmail.mockResolvedValue(null);
    mocks.repository.create.mockResolvedValue({ id: "invitation_1" });
    mocks.sendEmail.mockResolvedValue({ sent: true, developmentFallback: false });
    mocks.repository.findByTokenHash.mockResolvedValue(pendingInvitation());
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: { id: "user_2", email: "partner@example.com" },
    });
    mocks.repository.accept.mockResolvedValue({
      alreadyMember: false,
      alreadyAccepted: false,
    });
  });

  it("normalizes the email, creates an OWNER invitation, and stores a hash", async () => {
    const result = await service.createAndSend({
        role: "OWNER",
      weddingId: "wedding_1",
      weddingName: "A & B",
      invitedEmail: " Partner@Example.COM ",
      invitedByUserId: "owner_1",
      inviterFirstName: "Owner",
    });

    expect(result.memberInvitationId).toBe("invitation_1");
    expect(mocks.repository.findActiveMemberByWeddingAndEmail).toHaveBeenCalledWith(
      "wedding_1",
      "partner@example.com",
    );
    expect(mocks.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        weddingId: "wedding_1",
        invitedEmail: "partner@example.com",
        role: "OWNER",
        invitedByUserId: "owner_1",
      }),
    );

    const createInput = mocks.repository.create.mock.calls[0]?.[0];
    expect(createInput.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createInput.tokenHash).not.toBe(token);
    expect(createInput.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(createInput.expiresAt.getTime()).toBeLessThan(
      Date.now() + (WEDDING_MEMBER_INVITATION_EXPIRY_DAYS + 1) * 24 * 60 * 60 * 1000,
    );
  });

  it("rejects an email that already belongs to an active member", async () => {
    mocks.repository.findActiveMemberByWeddingAndEmail.mockResolvedValue({
      id: "membership_2",
    });

    await expect(
      service.createAndSend({
        role: "OWNER",
        weddingId: "wedding_1",
        weddingName: "A & B",
        invitedEmail: "partner@example.com",
        invitedByUserId: "owner_1",
        inviterFirstName: "Owner",
      }),
    ).rejects.toThrow("already belongs to an active member");

    expect(mocks.repository.findPendingByWeddingAndEmail).not.toHaveBeenCalled();
    expect(mocks.repository.create).not.toHaveBeenCalled();
  });

  it("rejects a duplicate pending invitation", async () => {
    mocks.repository.findPendingByWeddingAndEmail.mockResolvedValue(
      pendingInvitation(),
    );

    await expect(
      service.createAndSend({
        role: "OWNER",
        weddingId: "wedding_1",
        weddingName: "A & B",
        invitedEmail: "partner@example.com",
        invitedByUserId: "owner_1",
        inviterFirstName: "Owner",
      }),
    ).rejects.toThrow("A pending workspace invitation already exists");

    expect(mocks.repository.create).not.toHaveBeenCalled();
  });

  it("reissues a revoked invitation through the existing resend flow", async () => {
    mocks.repository.findForWedding.mockResolvedValue(
      pendingInvitation({ status: "REVOKED" }),
    );

    await service.resend({
      id: "invitation_1",
      weddingId: "wedding_1",
      weddingName: "A & B",
      invitedByUserId: "owner_1",
      inviterFirstName: "Owner",
    });

    expect(mocks.repository.revokeForWedding).not.toHaveBeenCalled();
    expect(mocks.repository.create).toHaveBeenCalled();
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceInvitationUrl: expect.stringMatching(
          /^https:\/\/tied-forever\.example\.com\/invitations\/accept\?token=[A-Za-z0-9_-]{43}$/,
        ),
      }),
    );
  });

  it("requires APP_URL when Resend is selected", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "resend");
    vi.stubEnv("APP_URL", "");

    await expect(
      service.createAndSend({
        role: "OWNER",
        weddingId: "wedding_1",
        weddingName: "A & B",
        invitedEmail: "partner@example.com",
        invitedByUserId: "owner_1",
        inviterFirstName: "Owner",
      }),
    ).rejects.toThrow("APP_URL must be configured before sending workspace invitations.");

    expect(mocks.repository.create).not.toHaveBeenCalled();
  });

  it("rejects non-web APP_URL schemes before creating an invitation", async () => {
    vi.stubEnv("APP_URL", "javascript:alert(1)");

    await expect(
      service.createAndSend({
        role: "OWNER",
        weddingId: "wedding_1",
        weddingName: "A & B",
        invitedEmail: "partner@example.com",
        invitedByUserId: "owner_1",
        inviterFirstName: "Owner",
      }),
    ).rejects.toThrow("APP_URL must use http or https for workspace invitations.");

    expect(mocks.repository.create).not.toHaveBeenCalled();
  });

  it("keeps the invitation record valid and returns a safe message when delivery fails", async () => {
    mocks.sendEmail.mockRejectedValue(
      new WeddingMemberInvitationEmailError("raw provider failure"),
    );

    await expect(
      service.createAndSend({
        role: "OWNER",
        weddingId: "wedding_1",
        weddingName: "A & B",
        invitedEmail: "partner@example.com",
        invitedByUserId: "owner_1",
        inviterFirstName: "Owner",
      }),
    ).resolves.toEqual({
      memberInvitationId: "invitation_1",
      emailSent: false,
      developmentFallback: false,
      developmentWorkspaceInvitationUrl: null,
      message:
        "The workspace invitation was created, but the email could not be sent. You can resend it from Settings.",
    });
  });

  it("rejects an expired invitation before authentication or membership changes", async () => {
    mocks.repository.findByTokenHash.mockResolvedValue(
      pendingInvitation({ expiresAt: new Date(Date.now() - 1000) }),
    );

    await expect(service.accept(token)).resolves.toEqual({
      ok: false,
      code: "EXPIRED",
    });

    expect(mocks.repository.markExpiredIfPending).toHaveBeenCalled();
    expect(mocks.repository.accept).not.toHaveBeenCalled();
    expect(mocks.getAuthenticatedUser).not.toHaveBeenCalled();
  });

  it("rejects a revoked invitation", async () => {
    mocks.repository.findByTokenHash.mockResolvedValue(
      pendingInvitation({ status: "REVOKED" }),
    );

    await expect(service.accept(token)).resolves.toEqual({
      ok: false,
      code: "REVOKED",
    });
    expect(mocks.getAuthenticatedUser).not.toHaveBeenCalled();
  });

  it("rejects a signed-in user whose verified email does not match", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: { id: "user_3", email: "different@example.com" },
    });

    await expect(service.accept(token)).resolves.toMatchObject({
      ok: false,
      code: "EMAIL_MISMATCH",
    });

    expect(mocks.repository.accept).not.toHaveBeenCalled();
  });

  it("accepts a valid invitation and returns the wedding for redirection", async () => {
    await expect(service.accept(token)).resolves.toEqual({
      ok: true,
      weddingId: "wedding_1",
      alreadyMember: false,
    });

    expect(mocks.repository.accept).toHaveBeenCalledWith({
      id: "invitation_1",
      weddingId: "wedding_1",
      userId: "user_2",
    });
  });

  it("treats an invitation already accepted by the same user as complete", async () => {
    mocks.repository.findByTokenHash.mockResolvedValue(
      pendingInvitation({
        status: "ACCEPTED",
        acceptedBy: { id: "user_2", email: "partner@example.com" },
      }),
    );

    await expect(service.accept(token)).resolves.toEqual({
      ok: true,
      weddingId: "wedding_1",
      alreadyMember: true,
    });

    expect(mocks.repository.accept).not.toHaveBeenCalled();
  });
});
