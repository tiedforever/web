import { beforeEach, describe, expect, it, vi } from "vitest";

import type { User } from "../app/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  currentUser: mocks.currentUser,
}));
vi.mock("../src/server/db/prisma", () => ({ prisma: mocks.prisma }));

import {
  AccountLinkConflictError,
  EmailVerificationRequiredError,
  getAuthenticatedUser,
} from "../src/server/auth/get-authenticated-user";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user_1",
    authProviderId: "clerk_1",
    email: "ada@example.com",
    firstName: "Ada",
    lastName: "Lovelace",
    profileImageUrl: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function makeClerkUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "clerk_1",
    primaryEmailAddress: {
      emailAddress: "ada@example.com",
      verification: { status: "verified" },
    },
    firstName: "Ada",
    lastName: "Lovelace",
    imageUrl: null,
    ...overrides,
  };
}

describe("getAuthenticatedUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: "clerk_1" });
    mocks.currentUser.mockResolvedValue(makeClerkUser());
  });

  it("returns an unchanged linked user without writing", async () => {
    const existingUser = makeUser();
    mocks.prisma.user.findUnique.mockResolvedValue(existingUser);

    const result = await getAuthenticatedUser();

    expect(result.user).toBe(existingUser);
    expect(mocks.auth).toHaveBeenCalledOnce();
    expect(mocks.currentUser).toHaveBeenCalledOnce();
    expect(mocks.prisma.user.findUnique).toHaveBeenCalledOnce();
    expect(mocks.prisma.user.create).not.toHaveBeenCalled();
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
    expect(mocks.prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it("surfaces incomplete email verification before syncing the profile", async () => {
    mocks.currentUser.mockResolvedValue(
      makeClerkUser({
        primaryEmailAddress: {
          emailAddress: "ada@example.com",
          verification: { status: "unverified" },
        },
      }),
    );

    await expect(getAuthenticatedUser()).rejects.toBeInstanceOf(
      EmailVerificationRequiredError,
    );
    expect(mocks.prisma.user.create).not.toHaveBeenCalled();
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
    expect(mocks.prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it("claims an existing unlinked email record instead of creating a duplicate", async () => {
    const associatedUser = makeUser();

    mocks.prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: associatedUser.id, authProviderId: "" })
      .mockResolvedValueOnce(associatedUser);
    mocks.prisma.user.updateMany.mockResolvedValue({ count: 1 });

    const result = await getAuthenticatedUser();

    expect(result.user).toBe(associatedUser);
    expect(mocks.prisma.user.create).not.toHaveBeenCalled();
    expect(mocks.prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: associatedUser.id, authProviderId: "" },
      data: {
        authProviderId: "clerk_1",
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
        profileImageUrl: null,
      },
    });
  });

  it("rejects an email already linked to another Clerk identity", async () => {
    mocks.prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "user_2", authProviderId: "clerk_2" });

    await expect(getAuthenticatedUser()).rejects.toBeInstanceOf(AccountLinkConflictError);
    expect(mocks.prisma.user.create).not.toHaveBeenCalled();
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
    expect(mocks.prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it("updates a linked user only when the Clerk profile changed", async () => {
    const existingUser = makeUser({ firstName: "Grace" });
    const updatedUser = makeUser({ firstName: "Ada" });
    mocks.prisma.user.findUnique.mockResolvedValue(existingUser);
    mocks.prisma.user.update.mockResolvedValue(updatedUser);

    const result = await getAuthenticatedUser();

    expect(result.user).toBe(updatedUser);
    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: existingUser.id },
      data: {
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
        profileImageUrl: null,
      },
    });
  });
});
