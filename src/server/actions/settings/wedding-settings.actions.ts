"use server";

import { revalidatePath } from "next/cache";

import {
  WeddingMemberRole,
} from "../../../../app/generated/prisma/client";
import {
  ActiveWeddingRequiredError,
} from "../../auth/get-active-wedding";
import { AuthenticationRequiredError } from "../../auth/get-authenticated-user";
import {
  PermissionDeniedError,
  requireRole,
} from "../../auth/authorization";
import { logger } from "../../logging/logger";
import {
  weddingRepository,
  WeddingRepositoryError,
} from "../../repositories/wedding.repository";

export type WeddingSettingsActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type WeddingGeneralSettingsData = {
  id: string;
  name: string;
  partnerOneName: string;
  partnerTwoName: string;
  weddingDate: string;
  timezone: string;
  currencyCode: string;
  mealChoicesEnabled: boolean;
  dietaryRequirementsEnabled: boolean;
};

export type WeddingLocationsData = {
  id: string;
  ceremonyLocation: string | null;
  receptionLocation: string | null;
};

const MAX_NAME_LENGTH = 120;
const MAX_PARTNER_NAME_LENGTH = 100;
const MAX_TIMEZONE_LENGTH = 100;
const MAX_LOCATION_LENGTH = 200;

function failure<T = never>(error: string): WeddingSettingsActionResult<T> {
  return { success: false, error };
}

function parseRecord(input: unknown): Record<string, unknown> | { error: string } {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { error: "Invalid wedding settings." };
  }

  return input as Record<string, unknown>;
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

function parseWeddingDate(value: unknown): Date | { error: string } {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: "Wedding date must be a valid date." };
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return { error: "Wedding date must be a valid date." };
  }

  return date;
}

function parseTimezone(value: unknown): string | { error: string } {
  const timezone = parseRequiredText(value, "Timezone", MAX_TIMEZONE_LENGTH);
  if (typeof timezone !== "string") return timezone;

  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: timezone }).format();
  } catch {
    return { error: "Timezone must be a valid IANA timezone." };
  }

  return timezone;
}

function parseCurrencyCode(value: unknown): string | { error: string } {
  if (typeof value !== "string" || !/^[a-zA-Z]{3}$/.test(value.trim())) {
    return { error: "Currency must be a three-letter currency code." };
  }

  return value.trim().toUpperCase();
}

function parseBoolean(value: unknown, field: string): boolean | { error: string } {
  return typeof value === "boolean"
    ? value
    : { error: `${field} must be a boolean value.` };
}

function isError(value: unknown): value is { error: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  );
}

function mapGeneralSettings(
  wedding: Awaited<ReturnType<typeof weddingRepository.getWeddingGeneralSettings>>,
): WeddingGeneralSettingsData {
  return {
    ...wedding,
    weddingDate: wedding.weddingDate.toISOString().slice(0, 10),
  };
}

function mapLocations(
  wedding: Awaited<ReturnType<typeof weddingRepository.getWeddingLocations>>,
): WeddingLocationsData {
  return wedding;
}

async function runSettingsAction<T>(
  actionName: string,
  access: "read" | "edit",
  operation: (weddingId: string) => Promise<T>,
): Promise<WeddingSettingsActionResult<T>> {
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
      return failure("Create or select a wedding before managing settings.");
    }
    if (error instanceof PermissionDeniedError) {
      return failure(error.message);
    }
    if (error instanceof WeddingRepositoryError) {
      return failure(error.message);
    }

    logger.error(`[wedding-settings] ${actionName} failed`, error);
    return failure(`Unable to ${actionName}. Please try again.`);
  }
}

export async function getWeddingGeneralSettings(): Promise<
  WeddingSettingsActionResult<WeddingGeneralSettingsData>
> {
  return runSettingsAction("load general settings", "read", async (weddingId) =>
    mapGeneralSettings(await weddingRepository.getWeddingGeneralSettings(weddingId)),
  );
}

export async function updateWeddingGeneralSettings(
  input: unknown,
): Promise<WeddingSettingsActionResult<WeddingGeneralSettingsData>> {
  const record = parseRecord(input);
  if (isError(record)) return failure(record.error);

  const name = parseRequiredText(record.name, "Wedding name", MAX_NAME_LENGTH);
  const partnerOneName = parseRequiredText(
    record.partnerOneName,
    "Partner one name",
    MAX_PARTNER_NAME_LENGTH,
  );
  const partnerTwoName = parseRequiredText(
    record.partnerTwoName,
    "Partner two name",
    MAX_PARTNER_NAME_LENGTH,
  );
  const weddingDate = parseWeddingDate(record.weddingDate);
  const timezone = parseTimezone(record.timezone);
  const currencyCode = parseCurrencyCode(record.currencyCode);
  const mealChoicesEnabled = parseBoolean(
    record.mealChoicesEnabled,
    "Meal choices enabled",
  );
  const dietaryRequirementsEnabled = parseBoolean(
    record.dietaryRequirementsEnabled,
    "Dietary requirements enabled",
  );

  if (isError(name)) return failure(name.error);
  if (isError(partnerOneName)) return failure(partnerOneName.error);
  if (isError(partnerTwoName)) return failure(partnerTwoName.error);
  if (isError(weddingDate)) return failure(weddingDate.error);
  if (isError(timezone)) return failure(timezone.error);
  if (isError(currencyCode)) return failure(currencyCode.error);
  if (isError(mealChoicesEnabled)) return failure(mealChoicesEnabled.error);
  if (isError(dietaryRequirementsEnabled)) return failure(dietaryRequirementsEnabled.error);

  return runSettingsAction("save general settings", "edit", async (weddingId) => {
    const wedding = await weddingRepository.updateWeddingGeneralSettings(weddingId, {
      name,
      partnerOneName,
      partnerTwoName,
      weddingDate,
      timezone,
      currencyCode,
      mealChoicesEnabled,
      dietaryRequirementsEnabled,
    });

    revalidateGeneralSettingsPaths();
    return mapGeneralSettings(wedding);
  });
}

export async function getWeddingLocations(): Promise<
  WeddingSettingsActionResult<WeddingLocationsData>
> {
  return runSettingsAction("load wedding locations", "read", async (weddingId) =>
    mapLocations(await weddingRepository.getWeddingLocations(weddingId)),
  );
}

export async function updateWeddingLocations(
  input: unknown,
): Promise<WeddingSettingsActionResult<WeddingLocationsData>> {
  const record = parseRecord(input);
  if (isError(record)) return failure(record.error);

  const ceremonyLocation = parseOptionalText(
    record.ceremonyLocation,
    "Ceremony location",
    MAX_LOCATION_LENGTH,
  );
  const receptionLocation = parseOptionalText(
    record.receptionLocation,
    "Reception location",
    MAX_LOCATION_LENGTH,
  );

  if (isError(ceremonyLocation)) return failure(ceremonyLocation.error);
  if (isError(receptionLocation)) return failure(receptionLocation.error);

  return runSettingsAction("save wedding locations", "edit", async (weddingId) => {
    const wedding = await weddingRepository.updateWeddingLocations(weddingId, {
      ceremonyLocation,
      receptionLocation,
    });

    revalidateLocationSettingsPaths();
    return mapLocations(wedding);
  });
}

function revalidateGeneralSettingsPaths() {
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/settings/general");
  revalidatePath("/dashboard");
}

function revalidateLocationSettingsPaths() {
  revalidatePath("/settings/locations");
  revalidatePath("/dashboard");
}
