import "server-only";

import { Prisma } from "../../../app/generated/prisma/client";
import { prisma } from "../db/prisma";
import { logger } from "../logging/logger";

const ONBOARDING_SKIPPED_KEY = "onboardingSkipped";

// Reuse the existing account-preferences JSON so skipping onboarding is
// account-scoped and durable without adding a schema field or migration.

function isJsonObject(
  value: Prisma.JsonValue | null | undefined,
): value is Prisma.JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class OnboardingRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OnboardingRepositoryError";
  }
}

export class OnboardingRepository {
  async hasSkippedOnboarding(userId: string): Promise<boolean> {
    try {
      const preference = await prisma.userPreference.findUnique({
        where: { userId },
        select: { additionalPreferences: true },
      });

      return isJsonObject(preference?.additionalPreferences)
        && preference.additionalPreferences[ONBOARDING_SKIPPED_KEY] === true;
    } catch (error) {
      logger.error("[onboarding-repository] load onboarding state failed", error);
      throw new OnboardingRepositoryError("Unable to load onboarding state");
    }
  }

  async markOnboardingSkipped(userId: string) {
    try {
      const preference = await prisma.userPreference.findUnique({
        where: { userId },
        select: { additionalPreferences: true },
      });

      const additionalPreferences: Prisma.InputJsonObject = {
        ...(isJsonObject(preference?.additionalPreferences)
          ? preference.additionalPreferences
          : {}),
        [ONBOARDING_SKIPPED_KEY]: true,
      };

      return await prisma.userPreference.upsert({
        where: { userId },
        create: {
          userId,
          activeWeddingId: null,
          theme: "light",
          emailNotificationsEnabled: true,
          taskNotificationsEnabled: true,
          paymentNotificationsEnabled: true,
          additionalPreferences,
        },
        update: { additionalPreferences },
      });
    } catch (error) {
      logger.error("[onboarding-repository] save onboarding state failed", error);
      throw new OnboardingRepositoryError("Unable to save onboarding state");
    }
  }
}

export const onboardingRepository = new OnboardingRepository();
