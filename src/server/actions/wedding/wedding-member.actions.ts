"use server";

import { revalidatePath } from "next/cache";
import { PermissionDeniedError, requireOwner } from "../../auth/authorization";
import { AuthenticationRequiredError } from "../../auth/get-authenticated-user";
import { ActiveWeddingRequiredError } from "../../auth/get-active-wedding";
import { logger } from "../../logging/logger";
import { removeWeddingMember, WeddingMemberServiceError } from "../../services/wedding-member.service";
import type { WeddingActionResult } from "./wedding.actions";

export async function removeMember(membershipId: unknown): Promise<WeddingActionResult<null>> {
  if (typeof membershipId !== "string" || !membershipId.trim()) {
    return { success: false, error: "Choose a wedding member to remove." };
  }
  try {
    const context = await requireOwner({ redirectToOnboarding: false });
    await removeWeddingMember({ weddingId: context.wedding.id, actingUserId: context.user.id, membershipId: membershipId.trim() });
    revalidatePath("/", "layout");
    return { success: true, data: null };
  } catch (error) {
    if (error instanceof WeddingMemberServiceError || error instanceof PermissionDeniedError || error instanceof AuthenticationRequiredError || error instanceof ActiveWeddingRequiredError) {
      return { success: false, error: error.message };
    }
    logger.error("[wedding-member] removal failed", error);
    return { success: false, error: "Unable to remove this member. Please try again." };
  }
}
