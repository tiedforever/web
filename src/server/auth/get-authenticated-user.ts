import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { cache } from "react";

import type { User } from "../../../app/generated/prisma/client";
import { prisma } from "../db/prisma";
import { measurePerformance } from "../logging/performance";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication is required.");
    this.name = "AuthenticationRequiredError";
  }
}

export class EmailVerificationRequiredError extends Error {
  constructor() {
    super("A verified primary email address is required.");
    this.name = "EmailVerificationRequiredError";
  }
}

export type AuthenticatedUser = {
  clerkUserId: string;
  user: User;
};

type UserProfile = Pick<
  User,
  "email" | "firstName" | "lastName" | "profileImageUrl"
>;

type UserIdentityReference = Pick<User, "id" | "authProviderId">;

const emailConflictMessage =
  "The authenticated email address is already linked to another application user.";

export class AccountLinkConflictError extends Error {
  constructor() {
    super(emailConflictMessage);
    this.name = "AccountLinkConflictError";
  }
}

export function getAccountAccessErrorCopy(error: unknown) {
  if (error instanceof AccountLinkConflictError) {
    return {
      title: "Your account link needs repair",
      message: "Your email is linked to a different account in Tied Forever. Contact support to repair the link to your existing account, then try again. Your wedding data has been preserved.",
    };
  }

  if (error instanceof EmailVerificationRequiredError) {
    return {
      title: "Verify your email to continue",
      message: "Verify the email address on your Tied Forever account, then sign in again.",
    };
  }

  return {
    title: "Your account could not be loaded",
    message: "We could not load your Tied Forever account right now. Please try again.",
  };
}

function hasUniqueConstraintCode(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function getClerkProfile(
  clerkUser: NonNullable<Awaited<ReturnType<typeof currentUser>>>,
): UserProfile {
  const primaryEmailAddress = clerkUser.primaryEmailAddress;
  const email = primaryEmailAddress?.emailAddress?.trim().toLowerCase();

  if (!email) {
    throw new Error(
      "The authenticated Clerk user does not have a usable primary email address.",
    );
  }

  if (primaryEmailAddress?.verification?.status !== "verified") {
    throw new EmailVerificationRequiredError();
  }

  const firstName = clerkUser.firstName?.trim();
  const lastName = clerkUser.lastName?.trim();

  if (!firstName || !lastName) {
    throw new Error(
      "The authenticated Clerk user must have a first name and last name.",
    );
  }

  return {
    email,
    firstName,
    lastName,
    profileImageUrl: clerkUser.imageUrl ?? null,
  };
}

function hasProfileChanged(user: User, profile: UserProfile): boolean {
  return (
    user.email !== profile.email ||
    user.firstName !== profile.firstName ||
    user.lastName !== profile.lastName ||
    user.profileImageUrl !== profile.profileImageUrl
  );
}

async function synchronizeExistingUser(
  user: User,
  profile: UserProfile,
): Promise<User> {
  if (!hasProfileChanged(user, profile)) {
    return user;
  }

  if (user.email !== profile.email) {
    const emailOwner = await prisma.user.findUnique({
      where: { email: profile.email },
      select: { id: true },
    });

    if (emailOwner && emailOwner.id !== user.id) {
      throw new AccountLinkConflictError();
    }
  }

  return prisma.user.update({
    where: { id: user.id },
    data: profile,
  });
}

async function associateExistingEmailUser(
  emailOwner: UserIdentityReference,
  clerkUserId: string,
  profile: UserProfile,
): Promise<User> {
  if (emailOwner.authProviderId === clerkUserId) {
    const existingUser = await prisma.user.findUnique({
      where: { id: emailOwner.id },
    });

    if (!existingUser) {
      throw new Error("The application user could not be resolved.");
    }

    return synchronizeExistingUser(existingUser, profile);
  }

  // authProviderId is required by the current schema. Treat an empty legacy
  // value defensively as unlinked, but never overwrite a real Clerk identity.
  if (emailOwner.authProviderId) {
    throw new AccountLinkConflictError();
  }

  const claimResult = await prisma.user.updateMany({
    where: {
      id: emailOwner.id,
      authProviderId: emailOwner.authProviderId,
    },
    data: {
      authProviderId: clerkUserId,
      ...profile,
    },
  });

  if (claimResult.count === 1) {
    const associatedUser = await prisma.user.findUnique({
      where: { id: emailOwner.id },
    });

    if (!associatedUser) {
      throw new Error("The application user could not be resolved.");
    }

    return associatedUser;
  }

  // Another request may have claimed the record. Re-read it before deciding
  // whether this Clerk identity may use it.
  const currentIdentity = await prisma.user.findUnique({
    where: { id: emailOwner.id },
    select: { authProviderId: true },
  });

  if (currentIdentity?.authProviderId === clerkUserId) {
    const associatedUser = await prisma.user.findUnique({
      where: { id: emailOwner.id },
    });

    if (!associatedUser) {
      throw new Error("The application user could not be resolved.");
    }

    return synchronizeExistingUser(associatedUser, profile);
  }

  throw new AccountLinkConflictError();
}

async function createUserOrRecoverFromRace(
  clerkUserId: string,
  profile: UserProfile,
): Promise<User> {
  try {
    return await prisma.user.create({
      data: {
        authProviderId: clerkUserId,
        ...profile,
      },
    });
  } catch (error) {
    if (!hasUniqueConstraintCode(error)) {
      throw error;
    }

    const userCreatedByAnotherRequest = await prisma.user.findUnique({
      where: { authProviderId: clerkUserId },
    });

    if (userCreatedByAnotherRequest) {
      return synchronizeExistingUser(userCreatedByAnotherRequest, profile);
    }

    const emailOwner = await prisma.user.findUnique({
      where: { email: profile.email },
      select: { id: true, authProviderId: true },
    });

    if (emailOwner) {
      return associateExistingEmailUser(emailOwner, clerkUserId, profile);
    }

    throw new Error(
      "The authenticated user could not be linked to an application account.",
    );
  }
}

/**
 * Resolve the current Clerk session and synchronise its safe profile fields
 * into the application User record. Existing unchanged users are returned
 * without a write. Production user update/deletion syncing should eventually
 * move to verified Clerk webhooks.
 */
const resolveAuthenticatedUser = cache(
  async (): Promise<AuthenticatedUser> =>
    measurePerformance("auth.total", async () => {
      const { clerkUser } = await measurePerformance(
        "auth.clerk",
        async () => {
          const { userId } = await auth();

          if (!userId) {
            throw new AuthenticationRequiredError();
          }

          const clerkUser = await currentUser();

          if (!clerkUser || clerkUser.id !== userId) {
            throw new AuthenticationRequiredError();
          }

          return { clerkUser };
        },
      );

      const user = await measurePerformance("auth.localUser", async () => {
        const existingUser = await prisma.user.findUnique({
          where: { authProviderId: clerkUser.id },
        });
        const profile = getClerkProfile(clerkUser);

        return existingUser
          ? synchronizeExistingUser(existingUser, profile)
          : (async () => {
              const existingEmailOwner = await prisma.user.findUnique({
                where: { email: profile.email },
                select: { id: true, authProviderId: true },
              });

              if (existingEmailOwner) {
                return associateExistingEmailUser(
                  existingEmailOwner,
                  clerkUser.id,
                  profile,
                );
              }

              return createUserOrRecoverFromRace(clerkUser.id, profile);
            })();
      });

      return { clerkUserId: clerkUser.id, user };
    }),
);

export function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  return resolveAuthenticatedUser();
}
