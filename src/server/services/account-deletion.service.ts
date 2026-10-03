import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import {
  MembershipStatus,
  Prisma,
  WeddingMemberRole,
} from "../../../app/generated/prisma/client";
import type {
  Task,
  User,
  UserPreference,
  WeddingInvitation as WeddingMemberInvitationRecord,
  WeddingMember,
} from "../../../app/generated/prisma/client";
import { prisma } from "../db/prisma";
import { logger } from "../logging/logger";

export type DeleteAccountInput = {
  userId: string;
  clerkUserId: string;
};

export class AccountDeletionServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountDeletionServiceError";
  }
}

type AssignedTaskSnapshot = Pick<Task, "id" | "assigneeId">;

/**
 * The local deletion commits before Clerk is called. Keeping the affected
 * rows in this request-scoped snapshot gives us a bounded compensation path
 * if Clerk rejects the deletion. No account data is persisted outside the
 * database, and a successful Clerk deletion never needs this snapshot again.
 */
type AccountDeletionSnapshot = {
  user: User;
  preference: UserPreference | null;
  memberships: WeddingMember[];
  sentMemberInvitations: WeddingMemberInvitationRecord[];
  acceptedMemberInvitationIds: string[];
  assignedTasks: AssignedTaskSnapshot[];
};

const ACCOUNT_DELETION_RETRY_ERROR =
  "Unable to delete your authentication account. Your application account was restored, so you can safely try again later.";
const ACCOUNT_DELETION_RECOVERY_ERROR =
  "We couldn't complete account deletion safely. Please contact support before trying again.";

export class AccountDeletionService {
  private async restoreLocalAccount(snapshot: AccountDeletionSnapshot) {
    await prisma.$transaction(async (tx) => {
      await tx.user.create({ data: snapshot.user });

      if (snapshot.memberships.length > 0) {
        await tx.weddingMember.createMany({ data: snapshot.memberships });
      }

      if (snapshot.sentMemberInvitations.length > 0) {
        await tx.weddingInvitation.createMany({
          data: snapshot.sentMemberInvitations,
        });
      }

      if (snapshot.preference) {
        await tx.userPreference.create({
          data: {
            ...snapshot.preference,
            additionalPreferences:
              snapshot.preference.additionalPreferences ?? Prisma.JsonNull,
          },
        });
      }

      if (snapshot.acceptedMemberInvitationIds.length > 0) {
        await tx.weddingInvitation.updateMany({
          where: { id: { in: snapshot.acceptedMemberInvitationIds } },
          data: { acceptedByUserId: snapshot.user.id },
        });
      }

      for (const task of snapshot.assignedTasks) {
        await tx.task.updateMany({
          where: { id: task.id },
          data: { assigneeId: task.assigneeId },
        });
      }
    });
  }

  async deleteAccount({ userId, clerkUserId }: DeleteAccountInput) {
    let snapshot: AccountDeletionSnapshot;

    try {
      snapshot = await prisma.$transaction(async (tx) => {
        const applicationUser = await tx.user.findUnique({
          where: { id: userId },
        });

        if (!applicationUser || applicationUser.authProviderId !== clerkUserId) {
          throw new AccountDeletionServiceError(
            "Your account could not be verified for deletion.",
          );
        }

        const soleOwnedWedding = await tx.weddingMember.findFirst({
          where: {
            userId,
            role: WeddingMemberRole.OWNER,
            status: MembershipStatus.ACTIVE,
            wedding: {
              members: {
                none: {
                  userId: { not: userId },
                  role: WeddingMemberRole.OWNER,
                  status: MembershipStatus.ACTIVE,
                },
              },
            },
          },
          select: { id: true },
        });

        if (soleOwnedWedding) {
          // Every owned wedding must retain another active owner. Pending
          // invitations and inactive memberships do not preserve ownership.
          throw new AccountDeletionServiceError(
            "You are the only active owner of at least one wedding. Add another owner or delete those weddings before deleting your account.",
          );
        }

        const memberships = await tx.weddingMember.findMany({
          where: { userId },
        });
        const membershipIds = memberships.map(({ id }) => id);

        const [preference, sentMemberInvitations, acceptedMemberInvitations, assignedTasks] =
          await Promise.all([
            tx.userPreference.findUnique({ where: { userId } }),
            tx.weddingInvitation.findMany({ where: { invitedByUserId: userId } }),
            tx.weddingInvitation.findMany({
              where: { acceptedByUserId: userId },
              select: { id: true },
            }),
            membershipIds.length > 0
              ? tx.task.findMany({
                  where: { assigneeId: { in: membershipIds } },
                  select: { id: true, assigneeId: true },
                })
              : Promise.resolve([]),
          ]);

        // Invitations created by this user have a Restrict foreign key. They
        // are removed so deleting the account cannot leave invalid inviter
        // references. Accepted memberships remain independent records.
        await tx.weddingInvitation.deleteMany({
          where: { invitedByUserId: userId },
        });

        // Removing memberships leaves the weddings and their other members
        // intact. Task.assigneeId uses SetNull, so assigned tasks remain valid
        // without retaining a deleted member record.
        await tx.weddingMember.deleteMany({ where: { userId } });

        // UserPreference cascades, and accepted invitation references use
        // SetNull, as defined in the Prisma schema.
        await tx.user.delete({ where: { id: userId } });

        return {
          user: applicationUser,
          preference,
          memberships,
          sentMemberInvitations,
          acceptedMemberInvitationIds: acceptedMemberInvitations.map(({ id }) => id),
          assignedTasks,
        };
      }, {
        // Prevent two owners deleting concurrently from each observing the
        // other as the remaining owner and leaving the wedding ownerless.
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (error instanceof AccountDeletionServiceError) throw error;

      // The transaction did not commit, so Clerk must not be touched. The
      // caller receives a safe retry message while the failure is logged.
      logger.error("[account-deletion] local account deletion failed", error);
      throw new AccountDeletionServiceError(
        "Unable to delete your account. Please try again.",
      );
    }

    try {
      const client = await clerkClient();
      await client.users.deleteUser(clerkUserId);
    } catch (error) {
      logger.error(
        "[account-deletion] Clerk deletion failed after local commit; attempting local account recovery",
        error,
      );

      try {
        await this.restoreLocalAccount(snapshot);
        logger.warn(
          "[account-deletion] local account restored after Clerk deletion failure",
        );
      } catch (recoveryError) {
        logger.error(
          "[account-deletion] local account recovery failed after Clerk deletion failure",
          recoveryError,
        );
        throw new AccountDeletionServiceError(ACCOUNT_DELETION_RECOVERY_ERROR);
      }

      throw new AccountDeletionServiceError(ACCOUNT_DELETION_RETRY_ERROR);
    }

    return null;
  }
}

export const accountDeletionService = new AccountDeletionService();
