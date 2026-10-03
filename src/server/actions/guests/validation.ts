import { GuestAgeGroup } from "../../../../app/generated/prisma/client";

export type GuestValidationResult<T> = { value: T } | { error: string };

export const guestAgeGroups = [
  GuestAgeGroup.ADULT,
  GuestAgeGroup.CHILD,
  GuestAgeGroup.INFANT,
] as const;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type InputRecord = Record<string, unknown>;

export function parseRecord(input: unknown): GuestValidationResult<InputRecord> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { error: "Invalid input" };
  }

  return { value: input as InputRecord };
}

export function parseId(
  value: unknown,
  field: string,
): GuestValidationResult<string> {
  if (typeof value !== "string" || !uuidPattern.test(value)) {
    return { error: `${field} is invalid` } as const;
  }

  return { value } as const;
}

export function parseRequiredText(
  value: unknown,
  field: string,
  maxLength: number,
): GuestValidationResult<string> {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { error: `${field} is required` } as const;
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    return { error: `${field} must be ${maxLength} characters or fewer` } as const;
  }

  return { value: trimmed } as const;
}

export function parseOptionalText(
  value: unknown,
  field: string,
  maxLength: number,
): GuestValidationResult<string | null> {
  if (value === undefined || value === null || value === "") {
    return { value: null } as const;
  }

  if (typeof value !== "string") {
    return { error: `${field} must be text` } as const;
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    return { error: `${field} must be ${maxLength} characters or fewer` } as const;
  }

  return { value: trimmed || null } as const;
}

export function parseEmail(value: unknown): GuestValidationResult<string | null> {
  const result = parseOptionalText(value, "Email", 254);
  if ("error" in result || result.value === null) return result;

  if (!emailPattern.test(result.value)) {
    return { error: "Email must be valid" } as const;
  }

  return { value: result.value.toLowerCase() } as const;
}

export function parseEnum<T extends string>(
  value: unknown,
  field: string,
  values: readonly T[],
): GuestValidationResult<T> {
  if (typeof value !== "string" || !values.includes(value as T)) {
    return { error: `${field} is invalid` } as const;
  }

  return { value: value as T } as const;
}

export function parseOptionalBoolean(
  value: unknown,
): GuestValidationResult<boolean | undefined> {
  if (value === undefined) return { value: undefined } as const;
  if (typeof value !== "boolean") return { error: "Filter is invalid" } as const;
  return { value } as const;
}

export function firstError(
  ...results: Array<{ error?: string; value?: unknown }>
) {
  return results.find((result) => result.error)?.error;
}

export function parsedValue<T>(result: { value: T } | { error: string }): T {
  if ("error" in result) {
    throw new Error(result.error);
  }

  return result.value;
}
