import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getSafeWorkspaceInvitationReturnPath,
  getWorkspaceInvitationAuthPath,
} from "../src/server/auth/safe-workspace-invitation-return";

const token = "a".repeat(32);
const invitationPath = `/invitations/accept?token=${token}`;

describe("workspace invitation auth return paths", () => {
  it("builds a safe Clerk sign-in URL with the invitation return path", () => {
    expect(
      getWorkspaceInvitationAuthPath(
        "/sign-in",
        invitationPath,
        " Partner@Example.COM ",
      ),
    ).toBe(
      `/sign-in?redirect_url=%2Finvitations%2Faccept%3Ftoken%3D${token}&email=partner%40example.com`,
    );
  });

  it("rejects external or unrelated redirect destinations", () => {
    expect(
      getSafeWorkspaceInvitationReturnPath(
        "https://example.com/invitations/accept?token=" + token,
      ),
    ).toBeNull();
    expect(
      getWorkspaceInvitationAuthPath("/sign-up", "/dashboard"),
    ).toBeNull();
    expect(
      getWorkspaceInvitationAuthPath(
        "/sign-in",
        "/invitations/accept?token=too-short",
      ),
    ).toBeNull();
  });

  it("does not add an unsafe email value to the auth URL", () => {
    expect(
      getWorkspaceInvitationAuthPath(
        "/sign-in",
        invitationPath,
        "not-an-email",
      ),
    ).toBe(`/sign-in?redirect_url=%2Finvitations%2Faccept%3Ftoken%3D${token}`);
  });
});
