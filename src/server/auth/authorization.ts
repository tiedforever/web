import "server-only";

import { type WeddingMemberRole } from "../../../app/generated/prisma/client";
import {
  requireActionWedding,
  requireWedding,
  type ActiveWeddingContext,
} from "./get-active-wedding";

export class PermissionDeniedError extends Error {
  constructor() {
    super("You do not have permission to perform this action.");
    this.name = "PermissionDeniedError";
  }
}

export async function requireRole(
  roles: WeddingMemberRole | readonly WeddingMemberRole[],
  options?: { redirectToOnboarding?: boolean },
): Promise<ActiveWeddingContext> {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  const context = options?.redirectToOnboarding === false
    ? await requireActionWedding()
    : await requireWedding();

  if (!allowedRoles.includes(context.role)) {
    throw new PermissionDeniedError();
  }

  return context;
}

export function requireOwner(options?: { redirectToOnboarding?: boolean }) {
  return requireRole("OWNER", options);
}

