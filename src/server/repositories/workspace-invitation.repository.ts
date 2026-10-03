import "server-only";

import {
  MembershipStatus,
  WeddingInvitationStatus as WeddingMemberInvitationStatus,
} from "../../../app/generated/prisma/client";
import type { WeddingInvitation as WeddingInvitationRecord, WeddingMemberRole } from "../../../app/generated/prisma/client";
import { prisma } from "../db/prisma";
import { logger } from "../logging/logger";

export type CreateWeddingMemberInvitationInput = {
  weddingId: string;
  invitedEmail: string;
  role: WeddingMemberRole;
  tokenHash: string;
  expiresAt: Date;
  invitedByUserId: string;
};

export type WeddingMemberInvitation = WeddingInvitationRecord;

export class WeddingMemberInvitationRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeddingMemberInvitationRepositoryError";
  }
}

export type WeddingMemberInvitationAcceptanceFailureCode =
  | "INVALID"
  | "EMAIL_MISMATCH";

export class WeddingMemberInvitationAcceptanceError extends WeddingMemberInvitationRepositoryError {
  constructor(
    message: string,
    readonly code: WeddingMemberInvitationAcceptanceFailureCode,
  ) {
    super(message);
    this.name = "WeddingMemberInvitationAcceptanceError";
  }
}

const workspaceInvitationInclude = {
  wedding: true,
  invitedBy: {
    select: { firstName: true, lastName: true, email: true },
  },
  acceptedBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
} as const;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

// The persisted Prisma model remains WeddingInvitation for migration and
// database compatibility. This repository exposes it as the workspace/member
// invitation domain so future GuestInvitation code has a separate boundary.
export class WeddingMemberInvitationRepository {
  async findByTokenHash(tokenHash: string) {
    try {
      return await prisma.weddingInvitation.findUnique({
        where: { tokenHash },
        include: workspaceInvitationInclude,
      });
    } catch (error) {
      logger.error("[workspace-invitation-repository] find workspace invitation failed", error);
      throw new WeddingMemberInvitationRepositoryError("Unable to find workspace invitation");
    }
  }

  async findPendingByWeddingAndEmail(weddingId: string, invitedEmail: string) {
    try {
      return await prisma.weddingInvitation.findFirst({
        where: {
          weddingId,
          invitedEmail,
          status: WeddingMemberInvitationStatus.PENDING,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: workspaceInvitationInclude,
      });
    } catch (error) {
      logger.error("[workspace-invitation-repository] find pending invitation failed", error);
      throw new WeddingMemberInvitationRepositoryError(
        "Unable to check existing workspace invitations",
      );
    }
  }

  async findActiveMemberByWeddingAndEmail(
    weddingId: string,
    invitedEmail: string,
  ) {
    try {
      return await prisma.weddingMember.findFirst({
        where: {
          weddingId,
          status: MembershipStatus.ACTIVE,
          user: {
            email: {
              equals: normalizeEmail(invitedEmail),
              mode: "insensitive",
            },
          },
        },
        select: { id: true },
      });
    } catch (error) {
      logger.error(
        "[workspace-invitation-repository] find active member by email failed",
        error,
      );
      throw new WeddingMemberInvitationRepositoryError(
        "Unable to check existing wedding members",
      );
    }
  }

  async create(input: CreateWeddingMemberInvitationInput) {
    try {
      return await prisma.weddingInvitation.create({
        data: {
          weddingId: input.weddingId,
          invitedEmail: input.invitedEmail,
          role: input.role,
          status: WeddingMemberInvitationStatus.PENDING,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          invitedByUserId: input.invitedByUserId,
        },
        include: workspaceInvitationInclude,
      });
    } catch (error) {
      logger.error("[workspace-invitation-repository] create invitation failed", error);
      throw new WeddingMemberInvitationRepositoryError("Unable to create workspace invitation");
    }
  }

  async findForWedding(id: string, weddingId: string) {
    try {
      return await prisma.weddingInvitation.findFirst({
        where: { id, weddingId },
        include: workspaceInvitationInclude,
      });
    } catch (error) {
      logger.error("[workspace-invitation-repository] load workspace invitation failed", error);
      throw new WeddingMemberInvitationRepositoryError("Unable to load workspace invitation");
    }
  }

  async listForWedding(weddingId: string) {
    try {
      return await prisma.weddingInvitation.findMany({
        where: { weddingId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          invitedEmail: true,
          role: true,
          status: true,
          expiresAt: true,
          acceptedAt: true,
          revokedAt: true,
          createdAt: true,
        },
      });
    } catch (error) {
      logger.error("[workspace-invitation-repository] list invitations failed", error);
      throw new WeddingMemberInvitationRepositoryError("Unable to list workspace invitations");
    }
  }

  async markExpiredIfPending(id: string, now: Date) {
    try {
      const result = await prisma.weddingInvitation.updateMany({
        where: {
          id,
          status: WeddingMemberInvitationStatus.PENDING,
          expiresAt: { lte: now },
        },
        data: { status: WeddingMemberInvitationStatus.EXPIRED },
      });

      return result.count > 0;
    } catch (error) {
      logger.error("[workspace-invitation-repository] expire invitation failed", error);
      throw new WeddingMemberInvitationRepositoryError("Unable to update workspace invitation");
    }
  }

  async revokeForWedding(id: string, weddingId: string) {
    try {
      const result = await prisma.weddingInvitation.updateMany({
        where: {
          id,
          weddingId,
          status: WeddingMemberInvitationStatus.PENDING,
        },
        data: {
          status: WeddingMemberInvitationStatus.REVOKED,
          revokedAt: new Date(),
        },
      });

      return result.count > 0;
    } catch (error) {
      logger.error("[workspace-invitation-repository] revoke invitation failed", error);
      throw new WeddingMemberInvitationRepositoryError("Unable to revoke workspace invitation");
    }
  }

  async accept(input: {
    id: string;
    weddingId: string;
    userId: string;
  }) {
    try {
      return await prisma.$transaction(async (tx) => {
        const now = new Date();
        const invitation = await tx.weddingInvitation.findUnique({
          where: { id: input.id },
          select: {
            weddingId: true,
            invitedEmail: true,
            role: true,
            status: true,
            expiresAt: true,
            acceptedByUserId: true,
          },
        });

        if (!invitation || invitation.weddingId !== input.weddingId) {
          throw new WeddingMemberInvitationAcceptanceError(
            "This workspace invitation is no longer valid.",
            "INVALID",
          );
        }
        const acceptedRole = invitation.role;

        const user = await tx.user.findUnique({
          where: { id: input.userId },
          select: { email: true },
        });

        if (!user) {
          throw new WeddingMemberInvitationAcceptanceError(
            "This workspace invitation is no longer valid.",
            "INVALID",
          );
        }

        if (invitation.status === WeddingMemberInvitationStatus.ACCEPTED) {
          if (invitation.acceptedByUserId === input.userId) {
            return { alreadyMember: true, alreadyAccepted: true };
          }

          throw new WeddingMemberInvitationAcceptanceError(
            "This workspace invitation is no longer valid.",
            "INVALID",
          );
        }

        if (
          invitation.status !== WeddingMemberInvitationStatus.PENDING ||
          invitation.expiresAt <= now
        ) {
          throw new WeddingMemberInvitationAcceptanceError(
            "This workspace invitation is no longer valid.",
            "INVALID",
          );
        }

        if (
          normalizeEmail(user.email) !== normalizeEmail(invitation.invitedEmail)
        ) {
          throw new WeddingMemberInvitationAcceptanceError(
            "This workspace invitation belongs to a different verified email address.",
            "EMAIL_MISMATCH",
          );
        }

        const invitationClaim = await tx.weddingInvitation.updateMany({
          where: {
            id: input.id,
            weddingId: input.weddingId,
            invitedEmail: invitation.invitedEmail,
            status: WeddingMemberInvitationStatus.PENDING,
            expiresAt: { gt: now },
          },
          data: {
            status: WeddingMemberInvitationStatus.ACCEPTED,
            acceptedByUserId: input.userId,
            acceptedAt: now,
          },
        });

        if (invitationClaim.count !== 1) {
          throw new WeddingMemberInvitationAcceptanceError(
            "This workspace invitation is no longer valid.",
            "INVALID",
          );
        }

        const existingMembership = await tx.weddingMember.findUnique({
          where: {
            weddingId_userId: {
              weddingId: input.weddingId,
              userId: input.userId,
            },
          },
        });

        const alreadyMember =
          existingMembership?.status === MembershipStatus.ACTIVE;

        if (existingMembership && !alreadyMember) {
          await tx.weddingMember.update({
            where: { id: existingMembership.id },
            data: {
              role: acceptedRole,
              status: MembershipStatus.ACTIVE,
              joinedAt: now,
              leftAt: null,
            },
          });
        } else if (!existingMembership) {
          await tx.weddingMember.create({
            data: {
              weddingId: input.weddingId,
              userId: input.userId,
              role: acceptedRole,
              status: MembershipStatus.ACTIVE,
              joinedAt: now,
            },
          });
        }

        await tx.userPreference.upsert({
          where: { userId: input.userId },
          create: {
            userId: input.userId,
            activeWeddingId: input.weddingId,
            theme: "light",
            emailNotificationsEnabled: true,
            taskNotificationsEnabled: true,
            paymentNotificationsEnabled: true,
          },
          update: { activeWeddingId: input.weddingId },
        });

        return { alreadyMember, alreadyAccepted: false };
      });
    } catch (error) {
      if (error instanceof WeddingMemberInvitationAcceptanceError) {
        throw error;
      }

      logger.error("[workspace-invitation-repository] accept invitation failed", error);
      throw new WeddingMemberInvitationRepositoryError("Unable to accept workspace invitation");
    }
  }
}

export const weddingMemberInvitationRepository = new WeddingMemberInvitationRepository();
