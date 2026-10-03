import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  markOnboardingSkipped: vi.fn(),
  revalidatePath: vi.fn(),
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));
vi.mock("../src/server/auth/get-authenticated-user", () => ({
  AuthenticationRequiredError: mocks.AuthenticationRequiredError,
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));
vi.mock("../src/server/repositories/onboarding.repository", () => ({
  OnboardingRepositoryError: class OnboardingRepositoryError extends Error {},
  onboardingRepository: {
    markOnboardingSkipped: mocks.markOnboardingSkipped,
  },
}));
vi.mock("../src/server/logging/logger", () => ({
  logger: { error: vi.fn() },
}));

import { skipOnboarding } from "../src/server/actions/onboarding/onboarding.actions";

describe("skipOnboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: { id: "user_1" },
    });
    mocks.markOnboardingSkipped.mockResolvedValue({ userId: "user_1" });
  });

  it("persists the skip for only the authenticated user and revalidates the shell", async () => {
    await expect(skipOnboarding()).resolves.toEqual({
      success: true,
      data: null,
    });

    expect(mocks.markOnboardingSkipped).toHaveBeenCalledWith("user_1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("does not persist anything when the user is not authenticated", async () => {
    mocks.getAuthenticatedUser.mockRejectedValue(
      new mocks.AuthenticationRequiredError(),
    );

    await expect(skipOnboarding()).resolves.toEqual({
      success: false,
      error: "Authentication is required.",
    });

    expect(mocks.markOnboardingSkipped).not.toHaveBeenCalled();
  });
});
