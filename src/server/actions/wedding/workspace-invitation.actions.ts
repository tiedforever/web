"use server";

import { revalidatePath } from "next/cache";
import { isWeddingMemberRole } from "@/src/types/wedding-member-role";

import { PermissionDeniedError, requireOwner } from "../../auth/authorization";
import { logger } from "../../logging/logger";
import type { WeddingActionResult } from "./wedding.actions";
import {
  isValidEmail,
  normalizeEmail,
  weddingMemberInvitationService,
  WeddingMemberInvitationServiceError,
} from "../../services/workspace-invitation.service";

export type WeddingMemberInvitationListItem = {
  id: string;
  invitedEmail: string;
  role: string;
  status: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

function failure<T = never>(error: string): WeddingActionResult<T> {
  return { success: false, error };
}

export async function createWeddingMemberInvitation(
  input: unknown,
): Promise<WeddingActionResult<{
  memberInvitationId: string;
  emailSent: boolean;
  message: string;
  developmentWorkspaceInvitationUrl: string | null;
}>> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return failure("Invalid member invitation details.");
  }

  const email = (input as Record<string, unknown>).email;
  const role = (input as Record<string, unknown>).role;
  if (typeof email !== "string" || !isValidEmail(email)) {
    return failure("Enter a valid member invitation email address.");
  }

  if (!isWeddingMemberRole(role)) {
    return failure("Choose Owner, Editor, or Viewer for the member invitation.");
  }

  try {
    const context = await requireOwner();
    const invitedEmail = normalizeEmail(email);

    if (invitedEmail === normalizeEmail(context.user.email)) {
      return failure("The member invitation email must be different from your own email.");
    }

    const memberInvitation = await weddingMemberInvitationService.createAndSend({
      weddingId: context.wedding.id,
      weddingName: context.wedding.name,
      invitedEmail,
      role,
      invitedByUserId: context.user.id,
      inviterFirstName: context.user.firstName,
    });

    revalidatePath("/settings");
    revalidatePath("/settings/members");
    revalidatePath("/settings/invitations");

    return {
      success: true,
      data: {
        memberInvitationId: memberInvitation.memberInvitationId,
        emailSent: memberInvitation.emailSent,
        message: memberInvitation.message,
        developmentWorkspaceInvitationUrl: memberInvitation.developmentWorkspaceInvitationUrl,
      },
    };
  } catch (error) {
    if (error instanceof PermissionDeniedError) return failure(error.message);
    if (error instanceof WeddingMemberInvitationServiceError) return failure(error.message);

    logger.error("[workspace-invitation] create member invitation failed", error);
    return failure("Unable to create member invitation. Please try again.");
  }
}

export async function listWeddingMemberInvitations(): Promise<
  WeddingActionResult<WeddingMemberInvitationListItem[]>
> {
  try {
    const context = await requireOwner();
    const memberInvitations = await weddingMemberInvitationService.list(context.wedding.id);

    return {
      success: true,
      data: memberInvitations.map((memberInvitation) => ({
        id: memberInvitation.id,
        invitedEmail: memberInvitation.invitedEmail,
        role: memberInvitation.role,
        status: memberInvitation.status,
        expiresAt: memberInvitation.expiresAt.toISOString(),
        acceptedAt: memberInvitation.acceptedAt?.toISOString() ?? null,
        revokedAt: memberInvitation.revokedAt?.toISOString() ?? null,
        createdAt: memberInvitation.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    if (error instanceof PermissionDeniedError) return failure(error.message);
    if (error instanceof WeddingMemberInvitationServiceError) return failure(error.message);

    logger.error("[workspace-invitation] list member invitations failed", error);
    return failure("Unable to load member invitations. Please try again.");
  }
}

export async function resendWeddingMemberInvitation(
  memberInvitationId: unknown,
): Promise<WeddingActionResult<{ message: string; developmentWorkspaceInvitationUrl: string | null }>> {
  if (typeof memberInvitationId !== "string" || memberInvitationId.trim().length === 0) {
    return failure("A member invitation is required.");
  }

  try {
    const context = await requireOwner();
    const memberInvitation = await weddingMemberInvitationService.resend({
      id: memberInvitationId,
      weddingId: context.wedding.id,
      weddingName: context.wedding.name,
      invitedByUserId: context.user.id,
      inviterFirstName: context.user.firstName,
    });

    revalidatePath("/settings");
    revalidatePath("/settings/members");
    revalidatePath("/settings/invitations");

    return {
      success: true,
      data: { message: memberInvitation.message, developmentWorkspaceInvitationUrl: memberInvitation.developmentWorkspaceInvitationUrl },
    };
  } catch (error) {
    if (error instanceof PermissionDeniedError) return failure(error.message);
    if (error instanceof WeddingMemberInvitationServiceError) return failure(error.message);

    logger.error("[workspace-invitation] resend member invitation failed", error);
    return failure("Unable to resend member invitation. Please try again.");
  }
}

export async function revokeWeddingMemberInvitation(
  memberInvitationId: unknown,
): Promise<WeddingActionResult<null>> {
  if (typeof memberInvitationId !== "string" || memberInvitationId.trim().length === 0) {
    return failure("A member invitation is required.");
  }

  try {
    const context = await requireOwner();
    await weddingMemberInvitationService.revoke(memberInvitationId, context.wedding.id);
    revalidatePath("/settings");
    revalidatePath("/settings/members");
    revalidatePath("/settings/invitations");
    return { success: true, data: null };
  } catch (error) {
    if (error instanceof PermissionDeniedError) return failure(error.message);
    if (error instanceof WeddingMemberInvitationServiceError) return failure(error.message);

    logger.error("[workspace-invitation] revoke member invitation failed", error);
    return failure("Unable to revoke member invitation. Please try again.");
  }
}
