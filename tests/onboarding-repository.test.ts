import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    userPreference: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("../src/server/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("../src/server/logging/logger", () => ({
  logger: { error: vi.fn() },
}));

import { onboardingRepository } from "../src/server/repositories/onboarding.repository";

describe("onboardingRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.userPreference.findUnique.mockResolvedValue(null);
    mocks.prisma.userPreference.upsert.mockResolvedValue({
      userId: "user_1",
    });
  });

  it("treats a missing preference as not skipped", async () => {
    await expect(
      onboardingRepository.hasSkippedOnboarding("user_1"),
    ).resolves.toBe(false);

    expect(mocks.prisma.userPreference.findUnique).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      select: { additionalPreferences: true },
    });
  });

  it("reads the persisted skip marker without treating other preferences as a skip", async () => {
    mocks.prisma.userPreference.findUnique.mockResolvedValue({
      additionalPreferences: {
        onboardingSkipped: true,
        reducedMotion: true,
      },
    });

    await expect(
      onboardingRepository.hasSkippedOnboarding("user_1"),
    ).resolves.toBe(true);

    mocks.prisma.userPreference.findUnique.mockResolvedValue({
      additionalPreferences: { onboardingSkipped: "true" },
    });

    await expect(
      onboardingRepository.hasSkippedOnboarding("user_1"),
    ).resolves.toBe(false);
  });

  it("persists the skip marker while preserving existing preference data", async () => {
    mocks.prisma.userPreference.findUnique.mockResolvedValue({
      additionalPreferences: { reducedMotion: true },
    });

    await onboardingRepository.markOnboardingSkipped("user_1");

    expect(mocks.prisma.userPreference.upsert).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      create: {
        userId: "user_1",
        activeWeddingId: null,
        theme: "light",
        emailNotificationsEnabled: true,
        taskNotificationsEnabled: true,
        paymentNotificationsEnabled: true,
        additionalPreferences: {
          reducedMotion: true,
          onboardingSkipped: true,
        },
      },
      update: {
        additionalPreferences: {
          reducedMotion: true,
          onboardingSkipped: true,
        },
      },
    });
  });
});
