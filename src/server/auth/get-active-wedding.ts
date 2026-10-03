import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import {
  MembershipStatus,
  type User,
  type Wedding,
  type WeddingMember,
  type WeddingMemberRole,
} from "../../../app/generated/prisma/client";
import { prisma } from "../db/prisma";
import { measurePerformance } from "../logging/performance";
import {
  AuthenticationRequiredError,
  getAuthenticatedUser,
} from "./get-authenticated-user";
import { weddingRepository } from "../repositories/wedding.repository";

export type AvailableWedding = {
  id: string;
  name: string;
  partnerOneName: string;
  partnerTwoName: string;
  weddingDate: Date;
  timezone: string;
};

type ActiveWeddingData = Pick<
  Wedding,
  | "id"
  | "name"
  | "partnerOneName"
  | "partnerTwoName"
  | "weddingDate"
  | "ceremonyLocation"
  | "receptionLocation"
  | "timezone"
>;

type ActiveWeddingMembership = Pick<
  WeddingMember,
  "id" | "weddingId" | "userId" | "role" | "status"
>;

export type ActiveWeddingContext = {
  user: User;
  wedding: ActiveWeddingData;
  membership: ActiveWeddingMembership;
  role: WeddingMemberRole;
  availableWeddings: AvailableWedding[];
};

export class ActiveWeddingRequiredError extends Error {
  constructor() {
    super("An active wedding is required.");
    this.name = "ActiveWeddingRequiredError";
  }
}

/**
 * Resolve the authenticated user's active wedding from active memberships.
 * The selected wedding is persisted in UserPreference and is always checked
 * against the user's current memberships before it is used.
 */
const resolveActiveWedding = cache(
  async (): Promise<ActiveWeddingContext | null> =>
    measurePerformance("activeWedding.total", async () => {
      const authenticatedUser = await getAuthenticatedUser();
      const [memberships, preference] = await Promise.all([
        measurePerformance("activeWedding.memberships", () =>
          prisma.weddingMember.findMany({
            where: {
              userId: authenticatedUser.user.id,
              status: MembershipStatus.ACTIVE,
            },
            select: {
              id: true,
              weddingId: true,
              userId: true,
              role: true,
              status: true,
              wedding: {
                select: {
                  id: true,
                  name: true,
                  partnerOneName: true,
                  partnerTwoName: true,
                  weddingDate: true,
                  ceremonyLocation: true,
                  receptionLocation: true,
                  timezone: true,
                },
              },
            },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          }),
        ),
        measurePerformance("activeWedding.preference", () =>
          prisma.userPreference.findUnique({
            where: { userId: authenticatedUser.user.id },
            select: { activeWeddingId: true },
          }),
        ),
      ]);

      if (memberships.length === 0) {
        return null;
      }

      const selectedMembership =
        memberships.find(
          (membership) => membership.weddingId === preference?.activeWeddingId,
        ) ?? memberships[0];

      if (preference?.activeWeddingId !== selectedMembership.weddingId) {
        await measurePerformance(
          "activeWedding.preferenceRepair",
          () =>
            weddingRepository.setActiveWedding(
              authenticatedUser.user.id,
              selectedMembership.weddingId,
            ),
        );
      }

      return {
        user: authenticatedUser.user,
        wedding: selectedMembership.wedding,
        membership: selectedMembership,
        role: selectedMembership.role,
        availableWeddings: memberships.map(({ wedding }) => ({
          id: wedding.id,
          name: wedding.name,
          partnerOneName: wedding.partnerOneName,
          partnerTwoName: wedding.partnerTwoName,
          weddingDate: wedding.weddingDate,
          timezone: wedding.timezone,
        })),
      };
    }),
);

export async function getActiveWedding(options?: {
  redirectToOnboarding?: boolean;
}): Promise<ActiveWeddingContext | null> {
  const context = await resolveActiveWedding();

  if (!context && options?.redirectToOnboarding) {
    redirect("/onboarding");
  }

  return context;
}

export async function requireWedding(): Promise<ActiveWeddingContext> {
  let context: ActiveWeddingContext | null;

  try {
    context = await getActiveWedding({ redirectToOnboarding: false });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect("/sign-in");
    }

    throw error;
  }

  if (!context) {
    redirect("/onboarding");
  }

  return context;
}

export async function requireActionWedding(): Promise<ActiveWeddingContext> {
  const context = await getActiveWedding({ redirectToOnboarding: false });

  if (!context) {
    throw new ActiveWeddingRequiredError();
  }

  return context;
}
