import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  getPublicWorkspaceInvitation: vi.fn(),
  accept: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`Redirect: ${path}`); }),
}));

vi.mock("server-only", () => ({}));
vi.mock("../src/server/db/prisma", () => ({ prisma: {} }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("../src/server/auth/get-authenticated-user", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/server/auth/get-authenticated-user")>(),
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));
vi.mock("../src/server/services/workspace-invitation.service", () => ({
  getPublicWorkspaceInvitation: mocks.getPublicWorkspaceInvitation,
  getWorkspaceInvitationReturnPath: (token: string) => `/invitations/accept?token=${token}`,
  normalizeEmail: (email: string) => email.trim().toLowerCase(),
  weddingMemberInvitationService: { accept: mocks.accept },
}));
vi.mock("../src/components/auth/sign-out-button", () => ({
  SignOutControl: ({ redirectUrl, label }: { redirectUrl: string; label: string }) => <a href={redirectUrl}>{label}</a>,
}));
vi.mock("../src/server/logging/logger", () => ({ logger: { error: vi.fn() } }));

import WorkspaceInvitationAcceptancePage from "../app/invitations/accept/page";
import { AccountLinkConflictError, AuthenticationRequiredError, EmailVerificationRequiredError } from "../src/server/auth/get-authenticated-user";

const token = "a".repeat(43);
const params = () => ({ searchParams: Promise.resolve({ token }) });

describe("workspace invitation acceptance page", () => {
  it.each(["OWNER", "EDITOR", "VIEWER"])("shows %s access before sign-in", async (role) => {
    mocks.getAuthenticatedUser.mockRejectedValue(new AuthenticationRequiredError());
    mocks.getPublicWorkspaceInvitation.mockResolvedValue({ state: "PENDING", invitedEmail: "ada@example.com", role, weddingName: "A & B", inviterName: "Ada", expiresAt: new Date("2026-12-01") });
    const markup = renderToStaticMarkup(await WorkspaceInvitationAcceptancePage(params()));
    expect(markup).toContain(role.charAt(0) + role.slice(1).toLowerCase());
    expect(markup).toContain("Sign in");
    expect(mocks.accept).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPublicWorkspaceInvitation.mockResolvedValue({ state: "PENDING", invitedEmail: "ada@example.com" });
    mocks.getAuthenticatedUser.mockResolvedValue({ user: { email: "ada@example.com" } });
  });

  it("identifies an account link conflict and retains the invitation for retry", async () => {
    mocks.getAuthenticatedUser.mockRejectedValue(new AccountLinkConflictError());
    const markup = renderToStaticMarkup(await WorkspaceInvitationAcceptancePage(params()));
    expect(markup).toContain("Your account link needs repair");
    expect(markup).not.toContain("Account verification required");
    expect(markup).toContain(`/invitations/accept?token=${token}`);
    expect(markup).toContain("Sign in again");
    expect(mocks.accept).not.toHaveBeenCalled();
  });

  it("keeps genuine email verification separate from account linking failures", async () => {
    mocks.getAuthenticatedUser.mockRejectedValue(new EmailVerificationRequiredError());
    const markup = renderToStaticMarkup(await WorkspaceInvitationAcceptancePage(params()));
    expect(markup).toContain("Verify your email to continue");
    expect(markup).toContain("Continue to email verification");
    expect(mocks.accept).not.toHaveBeenCalled();
  });

  it("redirects after accepting the invitation", async () => {
    mocks.accept.mockResolvedValue({ ok: true, alreadyMember: false });
    const markup = renderToStaticMarkup(await WorkspaceInvitationAcceptancePage(params()));
    expect(markup).toContain("Workspace invitation accepted");
    expect(markup).toContain('href="/dashboard?invitation=accepted"');
    expect(mocks.accept).toHaveBeenCalledWith(token);
  });

  it("does not swallow the redirect when revisiting an accepted invitation", async () => {
    mocks.getPublicWorkspaceInvitation.mockResolvedValue({ state: "ACCEPTED", acceptedByEmail: "ada@example.com" });
    await expect(WorkspaceInvitationAcceptancePage(params())).rejects.toThrow("Redirect: /dashboard?invitation=already-complete");
    expect(mocks.accept).not.toHaveBeenCalled();
  });
});
