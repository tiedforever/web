import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  setActiveWedding: vi.fn(),
  memberships: vi.fn(),
  preference: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("../src/server/auth/get-authenticated-user", () => ({
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));
vi.mock("../src/server/db/prisma", () => ({
  prisma: {
    weddingMember: { findMany: mocks.memberships },
    userPreference: { findUnique: mocks.preference },
  },
}));
vi.mock("../src/server/repositories/wedding.repository", () => ({
  weddingRepository: { setActiveWedding: mocks.setActiveWedding },
}));

import { getActiveWedding } from "../src/server/auth/get-active-wedding";

describe("active wedding context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedUser.mockResolvedValue({
      user: {
        id: "user_1",
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
        profileImageUrl: null,
      },
    });
    mocks.setActiveWedding.mockResolvedValue(undefined);
  });

  it("loads memberships and preference concurrently and repairs a stale preference safely", async () => {
    const started: string[] = [];
    let resolveMemberships!: (value: unknown[]) => void;
    let resolvePreference!: (value: unknown) => void;
    const memberships = new Promise<unknown[]>((resolve) => {
      resolveMemberships = resolve;
    });
    const preference = new Promise<unknown>((resolve) => {
      resolvePreference = resolve;
    });

    mocks.memberships.mockImplementation(() => {
      started.push("memberships");
      return memberships;
    });
    mocks.preference.mockImplementation(() => {
      started.push("preference");
      return preference;
    });

    const contextPromise = getActiveWedding();
    await Promise.resolve();

    expect(started).toEqual(["memberships", "preference"]);

    resolveMemberships([
      {
        id: "membership_1",
        weddingId: "wedding_1",
        userId: "user_1",
        role: "OWNER",
        status: "ACTIVE",
        wedding: {
          id: "wedding_1",
          name: "Ada & Charles",
          partnerOneName: "Ada",
          partnerTwoName: "Charles",
          weddingDate: new Date("2026-09-12T00:00:00.000Z"),
          ceremonyLocation: "St Martin-in-the-Fields",
          receptionLocation: "The Orangery",
          timezone: "Europe/London",
        },
      },
    ]);
    resolvePreference({ activeWeddingId: "wedding_from_another_membership" });

    await expect(contextPromise).resolves.toMatchObject({
      wedding: { id: "wedding_1", name: "Ada & Charles" },
      role: "OWNER",
      availableWeddings: [{ id: "wedding_1", name: "Ada & Charles" }],
    });
    expect(mocks.setActiveWedding).toHaveBeenCalledWith("user_1", "wedding_1");
    expect(mocks.memberships).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user_1", status: "ACTIVE" },
      select: expect.objectContaining({
        role: true,
        status: true,
        wedding: expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            name: true,
            weddingDate: true,
            timezone: true,
          }),
        }),
      }),
    }));
    expect(mocks.preference).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      select: { activeWeddingId: true },
    });
  });
});
