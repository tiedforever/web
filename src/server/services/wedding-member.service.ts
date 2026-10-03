import "server-only";

import { Prisma } from "../../../app/generated/prisma/client";
import { prisma } from "../db/prisma";

export class WeddingMemberServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeddingMemberServiceError";
  }
}

export async function removeWeddingMember(input: {
  weddingId: string;
  actingUserId: string;
  membershipId: string;
}) {
  await prisma.$transaction(async (tx) => {
    // Recheck authorization inside the transaction: the acting owner may
    // have been removed since the request's initial authentication check.
    const actor = await tx.weddingMember.findUnique({
      where: { weddingId_userId: { weddingId: input.weddingId, userId: input.actingUserId } },
    });
    if (actor?.role !== "OWNER" || actor.status !== "ACTIVE") {
      throw new WeddingMemberServiceError("Only active wedding owners can remove members.");
    }

    const member = await tx.weddingMember.findFirst({
      where: { id: input.membershipId, weddingId: input.weddingId, status: "ACTIVE" },
      include: { user: { select: { email: true } } },
    });
    if (!member) throw new WeddingMemberServiceError("This member no longer has access to this wedding.");
    if (member.userId === input.actingUserId) {
      throw new WeddingMemberServiceError("You cannot remove yourself. Use Account settings to delete your account.");
    }

    if (member.role === "OWNER") {
      const owners = await tx.weddingMember.count({
        where: { weddingId: input.weddingId, role: "OWNER", status: "ACTIVE" },
      });
      if (owners < 2) throw new WeddingMemberServiceError("The wedding must retain at least one active owner.");
    }

    const now = new Date();
    await tx.weddingMember.update({
      where: { id: member.id },
      data: { status: "REMOVED", leftAt: now },
    });
    await tx.task.updateMany({ where: { assigneeId: member.id }, data: { assigneeId: null } });
    await tx.userPreference.updateMany({
      where: { userId: member.userId, activeWeddingId: input.weddingId },
      data: { activeWeddingId: null },
    });
    // A pending link must not let the removed member immediately rejoin.
    await tx.weddingInvitation.updateMany({
      where: { weddingId: input.weddingId, invitedEmail: { equals: member.user.email, mode: "insensitive" }, status: "PENDING" },
      data: { status: "REVOKED", revokedAt: now },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
