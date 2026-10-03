"use server";

import { revalidatePath } from "next/cache";

import {
  AuthenticationRequiredError,
  getAuthenticatedUser,
} from "../../auth/get-authenticated-user";
import { logger } from "../../logging/logger";
import {
  onboardingRepository,
  OnboardingRepositoryError,
} from "../../repositories/onboarding.repository";

export type OnboardingActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function skipOnboarding(): Promise<OnboardingActionResult<null>> {
  try {
    const { user } = await getAuthenticatedUser();
    await onboardingRepository.markOnboardingSkipped(user.id);

    revalidatePath("/", "layout");
    revalidatePath("/dashboard");
    revalidatePath("/onboarding");

    return { success: true, data: null };
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return { success: false, error: "Authentication is required." };
    }

    if (error instanceof OnboardingRepositoryError) {
      return { success: false, error: error.message };
    }

    logger.error("[onboarding] skip onboarding failed", error);
    return { success: false, error: "Unable to skip onboarding. Please try again." };
  }
}
