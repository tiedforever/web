import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getActiveWedding: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));
vi.mock("../src/server/auth/get-active-wedding", () => ({
  getActiveWedding: mocks.getActiveWedding,
}));
vi.mock("../src/server/auth/get-authenticated-user", () => ({
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
}));

import { getWeddingPageContext } from "../src/server/auth/get-wedding-page-context";

describe("getWeddingPageContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for an authenticated user without an active wedding", async () => {
    mocks.getActiveWedding.mockResolvedValue(null);

    await expect(getWeddingPageContext()).resolves.toBeNull();
  });

  it("preserves the authorized active-wedding context", async () => {
    const context = {
      wedding: { id: "wedding_1" },
      role: "VIEWER",
    };
    mocks.getActiveWedding.mockResolvedValue(context);

    await expect(getWeddingPageContext()).resolves.toBe(context);
  });
});
