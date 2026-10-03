"use server";

import { revalidatePath } from "next/cache";

import {
  AuthenticationRequiredError,
  getAuthenticatedUser,
} from "../../auth/get-authenticated-user";
import { logger } from "../../logging/logger";
import {
  accountDeletionService,
  AccountDeletionServiceError,
} from "../../services/account-deletion.service";

export type AccountActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function failure<T = never>(error: string): AccountActionResult<T> {
  return { success: false, error };
}

export async function deleteMyAccount(
  confirmation: unknown,
): Promise<AccountActionResult<null>> {
  if (typeof confirmation !== "string" || confirmation.trim() !== "DELETE") {
    return failure("Type DELETE to confirm account deletion.");
  }

  try {
    const { clerkUserId, user } = await getAuthenticatedUser();

    await accountDeletionService.deleteAccount({
      userId: user.id,
      clerkUserId,
    });

    revalidatePath("/", "layout");
    return { success: true, data: null };
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return failure("Authentication is required.");
    }

    if (error instanceof AccountDeletionServiceError) {
      return failure(error.message);
    }

    logger.error("[account-deletion] action failed", error);
    return failure("Unable to delete your account. Please try again.");
  }
}
