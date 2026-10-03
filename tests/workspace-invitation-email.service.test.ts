import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resendSend: vi.fn(),
  resendKeys: [] as string[],
  loggerError: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("resend", () => ({
  Resend: class MockResend {
    readonly emails = { send: mocks.resendSend };

    constructor(apiKey: string) {
      mocks.resendKeys.push(apiKey);
    }
  },
}));
vi.mock("../src/server/logging/logger", () => ({
  logger: { error: mocks.loggerError },
}));

import {
  renderWeddingMemberInvitationEmail,
  sendWeddingMemberInvitationEmail,
  WeddingMemberInvitationEmailError,
} from "../src/server/services/email/workspace-invitation-email.service";

const invitation = {
  role: "OWNER" as const,
  invitedEmail: "partner@example.com",
  inviterFirstName: "Emily",
  weddingName: "Ethan & Emily's Wedding",
  workspaceInvitationUrl:
    "https://qa.tied-forever.com/invitations/accept?token=raw-token-value",
  expiresAt: new Date("2026-09-01T00:00:00.000Z"),
};

describe("workspace invitation email service", () => {
  it.each(["OWNER", "EDITOR", "VIEWER"] as const)("describes %s access in both email formats", (role) => {
    const result = renderWeddingMemberInvitationEmail({ ...invitation, role });
    const label = role.charAt(0) + role.slice(1).toLowerCase();
    expect(result.html).toContain(`<strong>${label}</strong>`);
    expect(result.text).toContain(label);
    if (role === "VIEWER") expect(result.text).toContain("without making changes");
  });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("EMAIL_PROVIDER", "resend");
    vi.stubEnv("RESEND_API_KEY", "re_preview_test_key");
    vi.stubEnv("EMAIL_FROM", "Tied Forever Preview <preview@tied-forever.com>");
    vi.stubEnv("VERCEL_ENV", "");
    mocks.resendKeys.length = 0;
    mocks.resendSend.mockResolvedValue({
      data: { id: "email_1" },
      error: null,
    });
  });

  it("sends the branded invitation through Resend with the configured sender and recipient", async () => {
    await expect(sendWeddingMemberInvitationEmail(invitation)).resolves.toEqual({
      sent: true,
      developmentFallback: false,
    });

    expect(mocks.resendKeys).toEqual(["re_preview_test_key"]);
    expect(mocks.resendSend).toHaveBeenCalledWith({
      from: "Tied Forever Preview <preview@tied-forever.com>",
      to: "partner@example.com",
      subject: "Emily invited you to Tied Forever",
      html: expect.stringContaining("Accept workspace invitation"),
      text: expect.stringContaining(invitation.workspaceInvitationUrl),
    });

    const payload = mocks.resendSend.mock.calls[0]?.[0];
    expect(payload.html).toContain("Ethan &amp; Emily&#039;s Wedding");
    expect(payload.html).toContain("Emily invited you to join");
    expect(payload.html).toContain("not a guest RSVP");
    expect(payload.text).toContain("1 September 2026");
  });

  it("requires the Resend API key", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    await expect(sendWeddingMemberInvitationEmail(invitation)).rejects.toThrow(
      "RESEND_API_KEY must be configured when EMAIL_PROVIDER=resend for workspace invitations.",
    );
    expect(mocks.resendKeys).toEqual([]);
  });

  it("requires the configured sender", async () => {
    vi.stubEnv("EMAIL_FROM", "");

    await expect(sendWeddingMemberInvitationEmail(invitation)).rejects.toThrow(
      "EMAIL_FROM must be configured when EMAIL_PROVIDER=resend for workspace invitations.",
    );
    expect(mocks.resendKeys).toEqual([]);
  });

  it("converts a Resend rejection into a safe error and logs no secret or token", async () => {
    const providerMessage = `provider failure ${invitation.workspaceInvitationUrl} re_preview_test_key`;
    mocks.resendSend.mockResolvedValue({
      data: null,
      error: {
        name: "invalid_api_key",
        statusCode: 401,
        message: providerMessage,
      },
    });

    await expect(sendWeddingMemberInvitationEmail(invitation)).rejects.toEqual(
      expect.objectContaining({
        name: "WeddingMemberInvitationEmailError",
        message: "Resend rejected the workspace invitation email.",
      }),
    );

    const logged = JSON.stringify(mocks.loggerError.mock.calls);
    expect(logged).toContain("invalid_api_key");
    expect(logged).toContain("401");
    expect(logged).not.toContain("re_preview_test_key");
    expect(logged).not.toContain("raw-token-value");
    expect(logged).not.toContain(providerMessage);
  });

  it("converts a transport exception into a safe error", async () => {
    mocks.resendSend.mockRejectedValue(new Error("network failure"));

    await expect(sendWeddingMemberInvitationEmail(invitation)).rejects.toEqual(
      expect.objectContaining({
        name: "WeddingMemberInvitationEmailError",
        message: "Unable to send the workspace invitation email through Resend.",
      }),
    );
  });

  it("keeps the development fallback when Resend is not selected", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "development");
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await expect(sendWeddingMemberInvitationEmail(invitation)).resolves.toEqual({
      sent: false,
      developmentFallback: true,
    });

    expect(mocks.resendKeys).toEqual([]);
    expect(info).toHaveBeenCalled();
    info.mockRestore();
  });

  it("marks Preview invitation subjects as QA", () => {
    vi.stubEnv("VERCEL_ENV", "preview");

    expect(renderWeddingMemberInvitationEmail(invitation).subject).toBe(
      "[QA] Emily invited you to Tied Forever",
    );
  });

  it("does not use the development fallback on hosted deployments", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "development");
    vi.stubEnv("VERCEL_ENV", "preview");

    await expect(sendWeddingMemberInvitationEmail(invitation)).rejects.toEqual(
      expect.objectContaining({
        name: "WeddingMemberInvitationEmailError",
        message:
          "A production email provider must be configured before sending workspace invitations.",
      }),
    );
  });

  it("renders the same invitation content independently of the transport", () => {
    const template = renderWeddingMemberInvitationEmail(invitation);

    expect(template.html).toContain("Tied Forever");
    expect(template.html).toContain("Accept workspace invitation");
    expect(template.text).toContain("Accept workspace invitation");
    expect(template.text).toContain(invitation.weddingName);
    expect(template.text).toContain(invitation.inviterFirstName);
  });

  it("uses the typed email error for configuration failures", () => {
    expect(new WeddingMemberInvitationEmailError("configuration")).toBeInstanceOf(
      Error,
    );
  });
});
