import "server-only";

import { cache } from "react";

import { getAuthenticatedUser } from "./get-authenticated-user";
import { onboardingRepository } from "../repositories/onboarding.repository";

const resolveOnboardingState = cache(async () => {
  const { user } = await getAuthenticatedUser();

  return {
    skipped: await onboardingRepository.hasSkippedOnboarding(user.id),
  };
});

export async function getOnboardingState() {
  return resolveOnboardingState();
}
