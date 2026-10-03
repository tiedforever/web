"use server";

import { WeddingMemberRole } from "../../../../app/generated/prisma/client";
import {
  ActiveWeddingRequiredError,
} from "../../auth/get-active-wedding";
import { AuthenticationRequiredError } from "../../auth/get-authenticated-user";
import { PermissionDeniedError, requireRole } from "../../auth/authorization";
import { logger } from "../../logging/logger";
import {
  GuestListRepositoryError,
  guestListRepository,
  parseGuestListFilters,
  type GuestListFiltersInput,
} from "../../repositories/guest-list.repository";
import {
  weddingSectionRepository,
  WeddingSectionRepositoryError,
} from "../../repositories/wedding-section.repository";
import type { GuestsReadData } from "../../../types/guests";

export type GuestsReadActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function failure<T = never>(error: string): GuestsReadActionResult<T> {
  return { success: false, error };
}

export async function getGuestsPageData(
  filters: GuestListFiltersInput = {},
  expectedWeddingId?: string,
): Promise<GuestsReadActionResult<GuestsReadData>> {
  const parsedFilters = parseGuestListFilters(filters);
  if ("error" in parsedFilters) return failure(parsedFilters.error);

  try {
    const context = await requireRole(
      [
        WeddingMemberRole.OWNER,
        WeddingMemberRole.EDITOR,
        WeddingMemberRole.VIEWER,
      ],
      { redirectToOnboarding: false },
    );

    if (expectedWeddingId && context.wedding.id !== expectedWeddingId) {
      return failure("Guest list not found.");
    }

    const [guestList, sections] = await Promise.all([
      guestListRepository.getGuestList(context.wedding.id, parsedFilters.value),
      weddingSectionRepository.getSections(context.wedding.id),
    ]);

    return {
      success: true,
      data: {
        guestList,
        sections: sections.map(({ id, name, active }) => ({ id, name, active })),
      },
    };
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return failure("Authentication is required.");
    }
    if (error instanceof ActiveWeddingRequiredError) {
      return failure("Create or select a wedding before viewing guests.");
    }
    if (error instanceof PermissionDeniedError) {
      return failure(error.message);
    }
    if (error instanceof GuestListRepositoryError) {
      return failure(error.message);
    }
    if (error instanceof WeddingSectionRepositoryError) {
      return failure(error.message);
    }

    logger.error("[guests] page read failed", error);
    return failure("Unable to load guest data.");
  }
}
