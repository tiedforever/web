"use server";

import { revalidatePath } from "next/cache";
import { ActiveWeddingRequiredError } from "../../auth/get-active-wedding";
import { AuthenticationRequiredError } from "../../auth/get-authenticated-user";
import {
  PermissionDeniedError,
  requireRole,
} from "../../auth/authorization";
import { logger } from "../../logging/logger";
import {
  GuestTagRepositoryError,
  guestTagRepository,
} from "../../repositories/guest-tag.repository";
import {
  firstError,
  parseId,
  parseOptionalText,
  parsedValue,
  parseRecord,
  parseRequiredText,
} from "./validation";
import type { GuestTagActionData } from "./guest.actions";

export type GuestTagActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function failure<T = never>(error: string): GuestTagActionResult<T> {
  return { success: false, error };
}

function mapTag(tag: {
  id: string;
  name: string;
  colour: string | null;
  _count?: { assignments: number };
}): GuestTagActionData {
  return {
    id: tag.id,
    name: tag.name,
    colour: tag.colour,
    guestCount: tag._count?.assignments,
  };
}

function parseTagInput(input: unknown):
  | { value: { name: string; colour: string | null } }
  | { error: string } {
  const record = parseRecord(input);
  if ("error" in record) return record;

  const name = parseRequiredText(record.value.name, "Tag name", 80);
  const colour = parseOptionalText(record.value.colour, "Colour", 50);
  const error = firstError(name, colour);
  if (error) return { error };

  return {
    value: {
      name: parsedValue(name) as string,
      colour: parsedValue(colour) as string | null,
    },
  };
}

async function runTagAction<T>(
  actionName: string,
  access: "read" | "edit",
  operation: (weddingId: string) => Promise<T>,
): Promise<GuestTagActionResult<T>> {
  try {
    const context = await requireRole(
      access === "read" ? ["OWNER", "EDITOR", "VIEWER"] : ["OWNER", "EDITOR"],
      { redirectToOnboarding: false },
    );
    return { success: true, data: await operation(context.wedding.id) };
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return failure("Authentication is required.");
    }
    if (error instanceof ActiveWeddingRequiredError) {
      return failure("Create or select a wedding before managing guest tags.");
    }
    if (error instanceof PermissionDeniedError) return failure(error.message);
    if (error instanceof GuestTagRepositoryError) return failure(error.message);

    logger.error(`[guest-tags] ${actionName} failed`, error);
    return failure(`Unable to ${actionName}. Please try again.`);
  }
}

function revalidateGuestTagPaths() {
  revalidatePath("/guests");
  revalidatePath("/guests/households");
}

export async function getGuestTags(): Promise<
  GuestTagActionResult<GuestTagActionData[]>
> {
  return runTagAction("load guest tags", "read", async (weddingId) =>
    (await guestTagRepository.listTags(weddingId)).map(mapTag),
  );
}

export async function createGuestTag(
  input: unknown,
): Promise<GuestTagActionResult<GuestTagActionData>> {
  const parsed = parseTagInput(input);
  if ("error" in parsed) return failure(parsed.error);

  return runTagAction("create guest tag", "edit", async (weddingId) => {
    const tag = await guestTagRepository.createTag(weddingId, parsed.value);
    revalidateGuestTagPaths();
    return mapTag(tag);
  });
}

export async function updateGuestTag(
  tagId: unknown,
  input: unknown,
): Promise<GuestTagActionResult<GuestTagActionData>> {
  const parsedId = parseId(tagId, "Tag");
  if ("error" in parsedId) return failure(parsedId.error);
  const parsed = parseTagInput(input);
  if ("error" in parsed) return failure(parsed.error);

  return runTagAction("update guest tag", "edit", async (weddingId) => {
    const tag = await guestTagRepository.updateTag(weddingId, parsedId.value, parsed.value);
    revalidateGuestTagPaths();
    return mapTag(tag);
  });
}

export async function deleteGuestTag(
  tagId: unknown,
): Promise<GuestTagActionResult<null>> {
  const parsedId = parseId(tagId, "Tag");
  if ("error" in parsedId) return failure(parsedId.error);

  return runTagAction("delete guest tag", "edit", async (weddingId) => {
    await guestTagRepository.deleteTag(weddingId, parsedId.value);
    revalidateGuestTagPaths();
    return null;
  });
}
