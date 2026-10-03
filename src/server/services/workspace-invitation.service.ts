import "server-only";

import { randomBytes, createHash } from "node:crypto";

import {
  WeddingInvitationStatus as WeddingMemberInvitationStatus,
  WeddingMemberRole,
} from "../../../app/generated/prisma/client";
import {
  WeddingMemberInvitationEmailError,
  sendWeddingMemberInvitationEmail,
} from "./email/workspace-invitation-email.service";
import {
  weddingMemberInvitationRepository,
  WeddingMemberInvitationAcceptanceError,
  WeddingMemberInvitationRepositoryError,
} from "../repositories/workspace-invitation.repository";
import { getAuthenticatedUser } from "../auth/get-authenticated-user";
import { logger } from "../logging/logger";
import { isWeddingMemberRole } from "@/src/types/wedding-member-role";

export const WEDDING_MEMBER_INVITATION_EXPIRY_DAYS = 7;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PublicWeddingMemberInvitation = {
  state: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED" | "INVALID";
  invitedEmail: string | null;
  role: WeddingMemberRole | null;
  acceptedByEmail: string | null;
  maskedEmail: string | null;
  weddingName: string | null;
  inviterName: string | null;
  expiresAt: Date | null;
};

export class WeddingMemberInvitationServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeddingMemberInvitationServiceError";
  }
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(normalizeEmail(value));
}

function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function createRawToken() {
  return randomBytes(32).toString("base64url");
}

function getWorkspaceInvitationUrl(token: string) {
  const configuredAppUrl = process.env.APP_URL?.trim();
  const isProduction = process.env.NODE_ENV === "production";
  const vercelEnvironment = process.env.VERCEL_ENV?.trim().toLowerCase();
  const isHostedDeployment =
    vercelEnvironment === "production" || vercelEnvironment === "preview";
  const isVercelProduction = vercelEnvironment === "production";
  const isVercelPreview = vercelEnvironment === "preview";
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();

  if (!configuredAppUrl && (isProduction || isHostedDeployment || provider === "resend")) {
    logger.error("[workspace-invitation] APP_URL is missing for invitation URLs");
    throw new WeddingMemberInvitationServiceError(
      "APP_URL must be configured before sending workspace invitations.",
    );
  }

  const appUrl = configuredAppUrl || "http://localhost:3000";

  try {
    const parsedAppUrl = new URL(appUrl);

    if (!['http:', 'https:'].includes(parsedAppUrl.protocol)) {
      throw new WeddingMemberInvitationServiceError(
        "APP_URL must use http or https for workspace invitations.",
      );
    }

    if (
      (isProduction || isHostedDeployment) &&
      ["localhost", "127.0.0.1", "::1"].includes(parsedAppUrl.hostname)
    ) {
      throw new WeddingMemberInvitationServiceError(
        "APP_URL must point to the deployed application in production.",
      );
    }

    if (
      isVercelProduction &&
      parsedAppUrl.origin !== "https://tied-forever.com"
    ) {
      throw new WeddingMemberInvitationServiceError(
        "APP_URL must point to https://tied-forever.com in the Production deployment.",
      );
    }

    if (isVercelPreview && parsedAppUrl.origin === "https://tied-forever.com") {
      throw new WeddingMemberInvitationServiceError(
        "APP_URL must point to the QA application in the Preview deployment.",
      );
    }

    return new URL(
      `/invitations/accept?token=${encodeURIComponent(token)}`,
      parsedAppUrl,
    ).toString();
  } catch (error) {
    if (error instanceof WeddingMemberInvitationServiceError) {
      throw error;
    }

    throw new WeddingMemberInvitationServiceError(
      "APP_URL must be a valid application URL.",
    );
  }
}

function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "the invited email address";

  const visibleLocalPart = localPart.length <= 2
    ? `${localPart[0] ?? ""}*`
    : `${localPart[0]}${"*".repeat(Math.min(localPart.length - 1, 5))}`;

  return `${visibleLocalPart}@${domain}`;
}

function mapWorkspaceInvitationState(status: WeddingMemberInvitationStatus): PublicWeddingMemberInvitation["state"] {
  return status;
}

export function getWorkspaceInvitationReturnPath(rawToken: string) {
  if (!TOKEN_PATTERN.test(rawToken)) return null;
  return `/invitations/accept?token=${encodeURIComponent(rawToken)}`;
}

export async function getPublicWorkspaceInvitation(rawToken: string): Promise<PublicWeddingMemberInvitation> {
  if (!TOKEN_PATTERN.test(rawToken)) {
    return {
      state: "INVALID",
      role: null,
      invitedEmail: null,
      acceptedByEmail: null,
      maskedEmail: null,
      weddingName: null,
      inviterName: null,
      expiresAt: null,
    };
  }

  const workspaceInvitation = await weddingMemberInvitationRepository.findByTokenHash(hashToken(rawToken));

  if (!workspaceInvitation) {
    return {
      state: "INVALID",
      role: null,
      invitedEmail: null,
      acceptedByEmail: null,
      maskedEmail: null,
      weddingName: null,
      inviterName: null,
      expiresAt: null,
    };
  }

  let status = workspaceInvitation.status;
  if (status === WeddingMemberInvitationStatus.PENDING && workspaceInvitation.expiresAt <= new Date()) {
    await weddingMemberInvitationRepository.markExpiredIfPending(workspaceInvitation.id, new Date());
    status = WeddingMemberInvitationStatus.EXPIRED;
  }

  return {
    state: mapWorkspaceInvitationState(status),
    role: workspaceInvitation.role,
    invitedEmail: status === WeddingMemberInvitationStatus.PENDING ? workspaceInvitation.invitedEmail : null,
    acceptedByEmail: workspaceInvitation.acceptedBy?.email ?? null,
    maskedEmail: maskEmail(workspaceInvitation.invitedEmail),
    weddingName: workspaceInvitation.wedding.name,
    inviterName: `${workspaceInvitation.invitedBy.firstName} ${workspaceInvitation.invitedBy.lastName}`.trim(),
    expiresAt: workspaceInvitation.expiresAt,
  };
}

export type WorkspaceInvitationDeliveryResult = {
  memberInvitationId: string;
  emailSent: boolean;
  developmentFallback: boolean;
  developmentWorkspaceInvitationUrl: string | null;
  message: string;
};

export class WeddingMemberInvitationService {
  async createAndSend(input: {
    weddingId: string;
    weddingName: string;
    invitedEmail: string;
    role: WeddingMemberRole;
    invitedByUserId: string;
    inviterFirstName: string;
  }): Promise<WorkspaceInvitationDeliveryResult> {
    const invitedEmail = normalizeEmail(input.invitedEmail);
    if (!isWeddingMemberRole(input.role)) {
      throw new WeddingMemberInvitationServiceError("Choose Owner, Editor, or Viewer for the member invitation.");
    }

    if (!isValidEmail(invitedEmail)) {
      throw new WeddingMemberInvitationServiceError("Enter a valid member invitation email address.");
    }

    const activeMember =
      await weddingMemberInvitationRepository.findActiveMemberByWeddingAndEmail(
        input.weddingId,
        invitedEmail,
      );

    if (activeMember) {
      throw new WeddingMemberInvitationServiceError(
        "This email address already belongs to an active member of this wedding.",
      );
    }

    const pending = await weddingMemberInvitationRepository.findPendingByWeddingAndEmail(
      input.weddingId,
      invitedEmail,
    );

    if (pending) {
      throw new WeddingMemberInvitationServiceError(
        "A pending workspace invitation already exists for this email address.",
      );
    }

    const rawToken = createRawToken();
    const expiresAt = new Date(
      Date.now() + WEDDING_MEMBER_INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );
    const workspaceInvitationUrl = getWorkspaceInvitationUrl(rawToken);
    const memberInvitation = await weddingMemberInvitationRepository.create({
      weddingId: input.weddingId,
      invitedEmail,
      role: input.role,
      tokenHash: hashToken(rawToken),
      expiresAt,
      invitedByUserId: input.invitedByUserId,
    });

    try {
      const delivery = await sendWeddingMemberInvitationEmail({
        invitedEmail,
        role: input.role,
        inviterFirstName: input.inviterFirstName,
        weddingName: input.weddingName,
        workspaceInvitationUrl,
        expiresAt,
      });

      return {
        memberInvitationId: memberInvitation.id,
        emailSent: delivery.sent,
        developmentFallback: delivery.developmentFallback,
        developmentWorkspaceInvitationUrl: delivery.developmentFallback ? workspaceInvitationUrl : null,
        message: delivery.sent
          ? "The workspace invitation email was sent."
          : "The workspace invitation was created. Open the development invitation link below to test it.",
      };
    } catch (error) {
      if (!(error instanceof WeddingMemberInvitationEmailError)) throw error;

      logger.error("[workspace-invitation] email delivery failed", error);
      return {
        memberInvitationId: memberInvitation.id,
        emailSent: false,
        developmentFallback: false,
        developmentWorkspaceInvitationUrl: null,
        message: "The workspace invitation was created, but the email could not be sent. You can resend it from Settings.",
      };
    }
  }

  async resend(input: {
    id: string;
    weddingId: string;
    weddingName: string;
    invitedByUserId: string;
    inviterFirstName: string;
  }) {
    const existing = await weddingMemberInvitationRepository.findForWedding(input.id, input.weddingId);

    if (!existing) {
      throw new WeddingMemberInvitationServiceError("Workspace invitation not found.");
    }

    if (existing.status === WeddingMemberInvitationStatus.ACCEPTED) {
      throw new WeddingMemberInvitationServiceError("This workspace invitation has already been accepted.");
    }

    if (existing.status === WeddingMemberInvitationStatus.PENDING) {
      await weddingMemberInvitationRepository.revokeForWedding(input.id, input.weddingId);
    }

    return this.createAndSend({
      weddingId: input.weddingId,
      weddingName: input.weddingName,
      invitedEmail: existing.invitedEmail,
      role: existing.role,
      invitedByUserId: input.invitedByUserId,
      inviterFirstName: input.inviterFirstName,
    });
  }

  async revoke(id: string, weddingId: string) {
    const existing = await weddingMemberInvitationRepository.findForWedding(id, weddingId);

    if (!existing) {
      throw new WeddingMemberInvitationServiceError("Workspace invitation not found.");
    }

    if (existing.status !== WeddingMemberInvitationStatus.PENDING) {
      throw new WeddingMemberInvitationServiceError("Only pending workspace invitations can be revoked.");
    }

    await weddingMemberInvitationRepository.revokeForWedding(id, weddingId);
  }

  async list(weddingId: string) {
    return weddingMemberInvitationRepository.listForWedding(weddingId);
  }

  async accept(rawToken: string) {
    if (!TOKEN_PATTERN.test(rawToken)) {
      return { ok: false as const, code: "INVALID" as const };
    }

    const workspaceInvitation = await weddingMemberInvitationRepository.findByTokenHash(hashToken(rawToken));

    if (!workspaceInvitation) return { ok: false as const, code: "INVALID" as const };
    if (workspaceInvitation.status === WeddingMemberInvitationStatus.REVOKED) {
      return { ok: false as const, code: "REVOKED" as const };
    }
    if (workspaceInvitation.status === WeddingMemberInvitationStatus.EXPIRED) {
      return { ok: false as const, code: "EXPIRED" as const };
    }
    if (workspaceInvitation.expiresAt <= new Date()) {
      await weddingMemberInvitationRepository.markExpiredIfPending(workspaceInvitation.id, new Date());
      return { ok: false as const, code: "EXPIRED" as const };
    }

    const { user } = await getAuthenticatedUser();
    const expectedEmail = normalizeEmail(workspaceInvitation.invitedEmail);

    if (normalizeEmail(user.email) !== expectedEmail) {
      return {
        ok: false as const,
        code: "EMAIL_MISMATCH" as const,
        maskedEmail: maskEmail(expectedEmail),
      };
    }

    if (workspaceInvitation.status === WeddingMemberInvitationStatus.ACCEPTED) {
      if (workspaceInvitation.acceptedBy?.id === user.id) {
        return {
          ok: true as const,
          weddingId: workspaceInvitation.weddingId,
          alreadyMember: true,
        };
      }

      return { ok: false as const, code: "ACCEPTED" as const };
    }

    let acceptance;
    try {
      acceptance = await weddingMemberInvitationRepository.accept({
        id: workspaceInvitation.id,
        weddingId: workspaceInvitation.weddingId,
        userId: user.id,
      });
    } catch (error) {
      if (error instanceof WeddingMemberInvitationAcceptanceError) {
        if (error.code === "EMAIL_MISMATCH") {
          return {
            ok: false as const,
            code: "EMAIL_MISMATCH" as const,
            maskedEmail: maskEmail(expectedEmail),
          };
        }

        return { ok: false as const, code: "INVALID" as const };
      }

      throw error;
    }

    return {
      ok: true as const,
      weddingId: workspaceInvitation.weddingId,
      alreadyMember: acceptance.alreadyMember,
    };
  }
}

export const weddingMemberInvitationService = new WeddingMemberInvitationService();

export function isWorkspaceInvitationRepositoryError(error: unknown): error is WeddingMemberInvitationRepositoryError {
  return error instanceof WeddingMemberInvitationRepositoryError;
}
