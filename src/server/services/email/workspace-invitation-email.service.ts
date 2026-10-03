import "server-only";

import { Resend } from "resend";

import { logger } from "../../logging/logger";
import { getWeddingMemberRoleLabel, weddingMemberRoles, type WeddingMemberRoleValue } from "@/src/types/wedding-member-role";

export type WeddingMemberInvitationEmailInput = {
  invitedEmail: string;
  role: WeddingMemberRoleValue;
  inviterFirstName: string;
  weddingName: string;
  workspaceInvitationUrl: string;
  expiresAt: Date;
};

export type WeddingMemberInvitationEmailResult = {
  sent: boolean;
  developmentFallback: boolean;
};

export class WeddingMemberInvitationEmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeddingMemberInvitationEmailError";
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatExpiry(expiresAt: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(expiresAt);
}

export function renderWeddingMemberInvitationEmail(input: WeddingMemberInvitationEmailInput) {
  const inviter = escapeHtml(input.inviterFirstName);
  const weddingName = escapeHtml(input.weddingName);
  const workspaceInvitationUrl = escapeHtml(input.workspaceInvitationUrl);
  const expiry = escapeHtml(formatExpiry(input.expiresAt));
  const roleLabel = getWeddingMemberRoleLabel(input.role);
  const roleArticle = input.role === "VIEWER" ? "a" : "an";
  const roleDescription = weddingMemberRoles.find((role) => role.value === input.role)?.description ?? "";
  const isPreviewDeployment =
    process.env.VERCEL_ENV?.trim().toLowerCase() === "preview";

  return {
    subject: `${isPreviewDeployment ? "[QA] " : ""}${input.inviterFirstName} invited you to Tied Forever`,
    html: `<div style="background:#fafaf8;color:#1c1c1c;font-family:Arial,sans-serif;padding:32px 16px">
  <div style="background:#ffffff;border:1px solid #e4e0d4;border-radius:16px;margin:0 auto;max-width:560px;padding:32px">
    <p style="color:#2d5a27;font-size:12px;font-weight:700;letter-spacing:.14em;margin:0;text-transform:uppercase">Tied Forever</p>
    <h1 style="font-family:Georgia,serif;font-size:30px;font-weight:400;line-height:1.2;margin:16px 0 0">You&apos;re invited to a wedding workspace</h1>
    <p style="color:#5d6057;font-size:15px;line-height:1.6;margin:18px 0 0">${inviter} invited you to join the private wedding workspace for <strong>${weddingName}</strong> on Tied Forever as ${roleArticle} <strong>${roleLabel}</strong>. ${roleDescription}</p>
    <p style="color:#7a7a6e;font-size:14px;line-height:1.6;margin:14px 0 0">This workspace invitation is for wedding planning access, not a guest RSVP.</p>
    <p style="margin:26px 0"><a href="${workspaceInvitationUrl}" style="background:#2d5a27;border-radius:10px;color:#ffffff;display:inline-block;font-size:15px;font-weight:700;padding:13px 20px;text-decoration:none">Accept workspace invitation</a></p>
    <p style="color:#7a7a6e;font-size:13px;line-height:1.6;margin:0">This workspace invitation expires on ${expiry} and should only be used by the invited email address.</p>
    <p style="color:#7a7a6e;font-size:13px;line-height:1.6;margin:18px 0 0">If the button does not work, copy and paste this link:</p>
    <p style="font-size:13px;line-height:1.6;margin:6px 0 0;overflow-wrap:anywhere"><a href="${workspaceInvitationUrl}" style="color:#2d5a27">${workspaceInvitationUrl}</a></p>
  </div>
</div>`,
    text: `${input.inviterFirstName} invited you to join the private wedding workspace for ${input.weddingName} on Tied Forever as ${roleArticle} ${roleLabel}. ${roleDescription}

This is a workspace invitation for wedding planning access, not a guest RSVP.

Accept workspace invitation: ${input.workspaceInvitationUrl}

This workspace invitation expires on ${formatExpiry(input.expiresAt)} and should only be used by the invited email address.`,
  };
}

function getResendConfiguration() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    logger.error(
      "[workspace-invitation-email] RESEND_API_KEY is missing for the Resend provider",
    );
    throw new WeddingMemberInvitationEmailError(
      "RESEND_API_KEY must be configured when EMAIL_PROVIDER=resend for workspace invitations.",
    );
  }

  const from = process.env.EMAIL_FROM?.trim();
  if (!from) {
    logger.error(
      "[workspace-invitation-email] EMAIL_FROM is missing for the Resend provider",
    );
    throw new WeddingMemberInvitationEmailError(
      "EMAIL_FROM must be configured when EMAIL_PROVIDER=resend for workspace invitations.",
    );
  }

  return { apiKey, from };
}

function getResendErrorDetails(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return { type: typeof error };
  }

  const providerError = error as {
    name?: unknown;
    statusCode?: unknown;
  };

  return {
    name: typeof providerError.name === "string" ? providerError.name : "unknown",
    statusCode:
      typeof providerError.statusCode === "number"
        ? providerError.statusCode
        : undefined,
  };
}

async function sendWithResend(
  input: WeddingMemberInvitationEmailInput,
  template: ReturnType<typeof renderWeddingMemberInvitationEmail>,
): Promise<WeddingMemberInvitationEmailResult> {
  const { apiKey, from } = getResendConfiguration();

  try {
    const resend = new Resend(apiKey);
    const response = await resend.emails.send({
      from,
      to: input.invitedEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (response.error) {
      logger.error("[workspace-invitation-email] Resend rejected email", {
        provider: "resend",
        ...getResendErrorDetails(response.error),
      });
      throw new WeddingMemberInvitationEmailError(
        "Resend rejected the workspace invitation email.",
      );
    }

    return { sent: true, developmentFallback: false };
  } catch (error) {
    if (error instanceof WeddingMemberInvitationEmailError) throw error;

    logger.error("[workspace-invitation-email] Resend delivery failed", {
      provider: "resend",
      ...getResendErrorDetails(error),
    });
    throw new WeddingMemberInvitationEmailError(
      "Unable to send the workspace invitation email through Resend.",
    );
  }
}

/**
 * Provider-independent email boundary. Provider selection does not change
 * workspace invitation persistence or acceptance logic.
 */
export async function sendWeddingMemberInvitationEmail(
  input: WeddingMemberInvitationEmailInput,
): Promise<WeddingMemberInvitationEmailResult> {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase() || "development";
  const template = renderWeddingMemberInvitationEmail(input);

  if (provider === "resend") {
    return sendWithResend(input, template);
  }

  if (provider === "development") {
    const vercelEnvironment = process.env.VERCEL_ENV?.trim().toLowerCase();
    const isHostedDeployment =
      vercelEnvironment === "production" || vercelEnvironment === "preview";

    if (process.env.NODE_ENV === "production" || isHostedDeployment) {
      throw new WeddingMemberInvitationEmailError(
        "A production email provider must be configured before sending workspace invitations.",
      );
    }

    console.info(
      "[workspace-invitation] Development email fallback; subject:",
      template.subject,
      "invitation URL omitted to avoid logging the raw invitation token.",
    );
    return { sent: false, developmentFallback: true };
  }

  throw new WeddingMemberInvitationEmailError(
    `Email provider \"${provider}\" is configured but has no workspace invitation transport implementation.`,
  );
}
