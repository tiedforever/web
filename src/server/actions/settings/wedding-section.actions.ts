"use server";

import { revalidatePath } from "next/cache";

import { WeddingMemberRole } from "../../../../app/generated/prisma/client";
import { ActiveWeddingRequiredError } from "../../auth/get-active-wedding";
import { AuthenticationRequiredError } from "../../auth/get-authenticated-user";
import { PermissionDeniedError, requireRole } from "../../auth/authorization";
import { logger } from "../../logging/logger";
import {
  weddingSectionRepository,
  WeddingSectionRepositoryError,
  type WeddingSectionData,
} from "../../repositories/wedding-section.repository";

export type WeddingSectionActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const MAX_SECTION_NAME_LENGTH = 100;
const MAX_SECTION_DESCRIPTION_LENGTH = 500;

function failure<T = never>(error: string): WeddingSectionActionResult<T> {
  return { success: false, error };
}

function parseRequiredText(
  value: unknown,
  field: string,
  maxLength: number,
): string | { error: string } {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { error: `${field} is required.` };
  }

  const trimmed = value.trim();
  return trimmed.length <= maxLength
    ? trimmed
    : { error: `${field} must be ${maxLength} characters or fewer.` };
}

function parseOptionalText(
  value: unknown,
  field: string,
  maxLength: number,
): string | null | { error: string } {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return { error: `${field} must be text.` };

  const trimmed = value.trim();
  return trimmed.length === 0
    ? null
    : trimmed.length <= maxLength
      ? trimmed
      : { error: `${field} must be ${maxLength} characters or fewer.` };
}

function parseSectionId(value: unknown): string | { error: string } {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { error: "A wedding day section is required." };
  }

  return value.trim();
}

function parseRecord(input: unknown): Record<string, unknown> | { error: string } {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { error: "Invalid wedding day section details." };
  }

  return input as Record<string, unknown>;
}

function parseBoolean(value: unknown, field: string): boolean | { error: string } {
  return typeof value === "boolean"
    ? value
    : { error: `${field} must be a boolean value.` };
}

function parseSectionIds(value: unknown): string[] | { error: string } {
  if (!Array.isArray(value) || value.length === 0) {
    return { error: "A complete wedding day section order is required." };
  }

  const sectionIds: string[] = [];
  for (const sectionId of value) {
    const parsed = parseSectionId(sectionId);
    if (typeof parsed !== "string") return parsed;
    sectionIds.push(parsed);
  }

  if (new Set(sectionIds).size !== sectionIds.length) {
    return { error: "A wedding day section cannot appear more than once." };
  }

  return sectionIds;
}

function isError(value: unknown): value is { error: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  );
}

async function runSectionAction<T>(
  actionName: string,
  access: "read" | "edit",
  operation: (weddingId: string) => Promise<T>,
): Promise<WeddingSectionActionResult<T>> {
  try {
    const context = await requireRole(
      access === "read"
        ? [WeddingMemberRole.OWNER, WeddingMemberRole.EDITOR, WeddingMemberRole.VIEWER]
        : [WeddingMemberRole.OWNER, WeddingMemberRole.EDITOR],
      { redirectToOnboarding: false },
    );

    return { success: true, data: await operation(context.wedding.id) };
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return failure("Authentication is required.");
    }
    if (error instanceof ActiveWeddingRequiredError) {
      return failure("Create or select a wedding before managing wedding day sections.");
    }
    if (error instanceof PermissionDeniedError) {
      return failure(error.message);
    }
    if (error instanceof WeddingSectionRepositoryError) {
      return failure(error.message);
    }

    logger.error(`[wedding-sections] ${actionName} failed`, error);
    return failure(`Unable to ${actionName}. Please try again.`);
  }
}

export async function getWeddingSections(): Promise<
  WeddingSectionActionResult<WeddingSectionData[]>
> {
  return runSectionAction("load wedding day sections", "read", (weddingId) =>
    weddingSectionRepository.getSections(weddingId),
  );
}

export async function initializeWeddingSections(): Promise<
  WeddingSectionActionResult<WeddingSectionData[]>
> {
  return runSectionAction("initialize wedding day sections", "edit", (weddingId) =>
    weddingSectionRepository.initializeDefaults(weddingId),
  ).then((result) => {
    if (result.success) revalidateSectionPaths();
    return result;
  });
}

export async function createWeddingSection(
  input: unknown,
): Promise<WeddingSectionActionResult<WeddingSectionData[]>> {
  const record = parseRecord(input);
  if (isError(record)) return failure(record.error);

  const name = parseRequiredText(record.name, "Section name", MAX_SECTION_NAME_LENGTH);
  const description = parseOptionalText(
    record.description,
    "Section description",
    MAX_SECTION_DESCRIPTION_LENGTH,
  );

  if (isError(name)) return failure(name.error);
  if (isError(description)) return failure(description.error);

  return runSectionAction("create wedding day section", "edit", (weddingId) =>
    weddingSectionRepository.createSection(weddingId, { name, description }),
  ).then((result) => {
    if (result.success) revalidateSectionPaths();
    return result;
  });
}

export async function updateWeddingSection(
  sectionId: unknown,
  input: unknown,
): Promise<WeddingSectionActionResult<WeddingSectionData[]>> {
  const parsedSectionId = parseSectionId(sectionId);
  if (isError(parsedSectionId)) return failure(parsedSectionId.error);

  const record = parseRecord(input);
  if (isError(record)) return failure(record.error);

  const name = parseRequiredText(record.name, "Section name", MAX_SECTION_NAME_LENGTH);
  const description = parseOptionalText(
    record.description,
    "Section description",
    MAX_SECTION_DESCRIPTION_LENGTH,
  );

  if (isError(name)) return failure(name.error);
  if (isError(description)) return failure(description.error);

  return runSectionAction("update wedding day section", "edit", (weddingId) =>
    weddingSectionRepository.updateSection(weddingId, parsedSectionId, {
      name,
      description,
    }),
  ).then((result) => {
    if (result.success) revalidateSectionPaths();
    return result;
  });
}

export async function setWeddingSectionActive(
  sectionId: unknown,
  active: unknown,
): Promise<WeddingSectionActionResult<WeddingSectionData[]>> {
  const parsedSectionId = parseSectionId(sectionId);
  if (isError(parsedSectionId)) return failure(parsedSectionId.error);

  const parsedActive = parseBoolean(active, "Section availability");
  if (isError(parsedActive)) return failure(parsedActive.error);

  return runSectionAction("change wedding day section availability", "edit", (weddingId) =>
    weddingSectionRepository.setActive(weddingId, parsedSectionId, parsedActive),
  ).then((result) => {
    if (result.success) revalidateSectionPaths();
    return result;
  });
}

export async function reorderWeddingSections(
  sectionIds: unknown,
): Promise<WeddingSectionActionResult<WeddingSectionData[]>> {
  const parsedSectionIds = parseSectionIds(sectionIds);
  if (isError(parsedSectionIds)) return failure(parsedSectionIds.error);

  return runSectionAction("reorder wedding day sections", "edit", (weddingId) =>
    weddingSectionRepository.reorderSections(weddingId, parsedSectionIds),
  ).then((result) => {
    if (result.success) revalidateSectionPaths();
    return result;
  });
}

export async function deleteWeddingSection(
  sectionId: unknown,
): Promise<WeddingSectionActionResult<WeddingSectionData[]>> {
  const parsedSectionId = parseSectionId(sectionId);
  if (isError(parsedSectionId)) return failure(parsedSectionId.error);

  return runSectionAction("delete wedding day section", "edit", (weddingId) =>
    weddingSectionRepository.deleteSection(weddingId, parsedSectionId),
  ).then((result) => {
    if (result.success) revalidateSectionPaths();
    return result;
  });
}

function revalidateSectionPaths() {
  revalidatePath("/settings/sections");
  revalidatePath("/guests");
}
