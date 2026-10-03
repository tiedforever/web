"use server";

import { revalidatePath } from "next/cache";

import {
  ActiveWeddingRequiredError,
  requireActionWedding,
} from "../../auth/get-active-wedding";
import {
  AuthenticationRequiredError,
  getAuthenticatedUser,
} from "../../auth/get-authenticated-user";
import { PermissionDeniedError, requireOwner } from "../../auth/authorization";
import { logger } from "../../logging/logger";
import {
  weddingRepository,
  WeddingRepositoryError,
} from "../../repositories/wedding.repository";
import {
  isValidEmail,
  normalizeEmail,
  weddingMemberInvitationService,
} from "../../services/workspace-invitation.service";

export type WeddingActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const MAX_NAME_LENGTH = 120;
const MAX_PARTNER_NAME_LENGTH = 100;
const MAX_TIMEZONE_LENGTH = 100;
const MAX_LOCATION_LENGTH = 200;

export type WeddingMemberListItem = {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  role: string;
  joinedAt: string | null;
};

function failure<T = never>(error: string): WeddingActionResult<T> {
  return { success: false, error };
}

function parseRequiredString(
  value: unknown,
  field: string,
  maxLength: number,
): string | { error: string } {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { error: `${field} is required.` };
  }

  const valueToUse = value.trim();

  if (valueToUse.length > maxLength) {
    return { error: `${field} must be ${maxLength} characters or fewer.` };
  }

  return valueToUse;
}

function parseOptionalString(
  value: unknown,
  field: string,
  maxLength: number,
): string | null | { error: string } {
  if (value === undefined || value === null) return null;

  if (typeof value !== "string") {
    return { error: `${field} must be text.` };
  }

  const valueToUse = value.trim();

  if (valueToUse.length > maxLength) {
    return { error: `${field} must be ${maxLength} characters or fewer.` };
  }

  return valueToUse.length > 0 ? valueToUse : null;
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
  const timezone = parseRequiredString(value, "Timezone", MAX_TIMEZONE_LENGTH);

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

function isError(value: unknown): value is { error: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  );
}

export async function createWedding(
  input: unknown,
): Promise<
  WeddingActionResult<{
    id: string;
    memberInvitationMessage?: string;
    memberInvitationId?: string;
    developmentWorkspaceInvitationUrl?: string | null;
  }>
> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return failure("Invalid wedding details.");
  }

  const record = input as Record<string, unknown>;
  const name = parseRequiredString(record.name, "Wedding name", MAX_NAME_LENGTH);
  const partnerOneName = parseRequiredString(
    record.partnerOneName,
    "Partner one name",
    MAX_PARTNER_NAME_LENGTH,
  );
  const partnerTwoName = parseRequiredString(
    record.partnerTwoName,
    "Partner two name",
    MAX_PARTNER_NAME_LENGTH,
  );
  const weddingDate = parseWeddingDate(record.weddingDate);
  const timezone = parseTimezone(record.timezone);
  const currencyCode = parseCurrencyCode(record.currencyCode);
  const ceremonyLocation = parseOptionalString(
    record.ceremonyLocation,
    "Ceremony location",
    MAX_LOCATION_LENGTH,
  );
  const receptionLocation = parseOptionalString(
    record.receptionLocation,
    "Reception location",
    MAX_LOCATION_LENGTH,
  );

  if (isError(name)) return failure(name.error);
  if (isError(partnerOneName)) return failure(partnerOneName.error);
  if (isError(partnerTwoName)) return failure(partnerTwoName.error);
  if (isError(weddingDate)) return failure(weddingDate.error);
  if (isError(timezone)) return failure(timezone.error);
  if (isError(currencyCode)) return failure(currencyCode.error);
  if (isError(ceremonyLocation)) return failure(ceremonyLocation.error);
  if (isError(receptionLocation)) return failure(receptionLocation.error);

  const invitePartner = record.invitePartner === true;
  if (
    record.invitePartner !== undefined &&
    typeof record.invitePartner !== "boolean"
  ) {
    return failure("Workspace invitation preference is invalid.");
  }

  let partnerEmail: string | null = null;
  if (invitePartner) {
    if (typeof record.partnerEmail !== "string" || record.partnerEmail.trim().length === 0) {
      return failure("Fiancé(e) email is required when a workspace invitation is selected.");
    }

    partnerEmail = normalizeEmail(record.partnerEmail);
    if (!isValidEmail(partnerEmail)) {
      return failure("Enter a valid fiancé(e) email address.");
    }
  }

  try {
    const { user } = await getAuthenticatedUser();

    if (partnerEmail && normalizeEmail(user.email) === partnerEmail) {
      return failure("The workspace invitation email must be different from your own email.");
    }

    const wedding = await weddingRepository.createWeddingWithOwner({
      userId: user.id,
      name,
      partnerOneName,
      partnerTwoName,
      weddingDate,
      timezone,
      currencyCode,
      ceremonyLocation,
      receptionLocation,
    });

    await weddingRepository.setActiveWedding(user.id, wedding.id);

    let memberInvitationMessage: string | undefined;
    let memberInvitationId: string | undefined;
    let developmentWorkspaceInvitationUrl: string | null | undefined;

    if (partnerEmail) {
      try {
        const memberInvitation = await weddingMemberInvitationService.createAndSend({
          weddingId: wedding.id,
          weddingName: wedding.name,
          invitedEmail: partnerEmail,
          role: "OWNER",
          invitedByUserId: user.id,
          inviterFirstName: user.firstName,
        });
        memberInvitationMessage = memberInvitation.message;
        memberInvitationId = memberInvitation.memberInvitationId;
        developmentWorkspaceInvitationUrl = memberInvitation.developmentWorkspaceInvitationUrl;
      } catch (error) {
        logger.error("[wedding] create workspace invitation after wedding creation failed", error);
        memberInvitationMessage =
          "Your wedding was created, but the member invitation could not be created. You can send it later from Settings.";
      }
    }

    revalidatePath("/", "layout");
    revalidatePath("/dashboard");
    revalidatePath("/onboarding");

    return {
      success: true,
      data: {
        id: wedding.id,
        memberInvitationMessage,
        memberInvitationId,
        developmentWorkspaceInvitationUrl,
      },
    };
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return failure("Authentication is required.");
    }

    if (error instanceof WeddingRepositoryError) {
      return failure(error.message);
    }

    logger.error("[wedding] create wedding failed", error);
    return failure("Unable to create wedding. Please try again.");
  }
}

export async function listWeddingMembers(): Promise<
  WeddingActionResult<WeddingMemberListItem[]>
> {
  try {
    const context = await requireActionWedding();
    const members = await weddingRepository.listActiveMembers(context.wedding.id);

    return {
      success: true,
      data: members.map((member) => ({
        id: member.id,
        userId: member.user.id,
        email: member.user.email,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        profileImageUrl: member.user.profileImageUrl,
        role: member.role,
        joinedAt: member.joinedAt?.toISOString() ?? null,
      })),
    };
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return failure("Authentication is required.");
    }

    if (error instanceof ActiveWeddingRequiredError) {
      return failure("There is no active wedding.");
    }

    if (error instanceof WeddingRepositoryError) return failure(error.message);

    logger.error("[wedding] list members failed", error);
    return failure("Unable to load wedding members. Please try again.");
  }
}

export async function setActiveWedding(
  weddingId: unknown,
): Promise<WeddingActionResult<null>> {
  if (typeof weddingId !== "string" || weddingId.trim().length === 0) {
    return failure("A wedding is required.");
  }

  try {
    const { user } = await getAuthenticatedUser();
    const membership = await weddingRepository.getActiveMembership(
      user.id,
      weddingId.trim(),
    );

    if (!membership) {
      return failure("You do not belong to that wedding.");
    }

    await weddingRepository.setActiveWedding(user.id, membership.weddingId);
    revalidatePath("/", "layout");
    revalidatePath("/dashboard");
    revalidatePath("/checklist");

    return { success: true, data: null };
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return failure("Authentication is required.");
    }

    if (error instanceof WeddingRepositoryError) {
      return failure(error.message);
    }

    logger.error("[wedding] set active wedding failed", error);
    return failure("Unable to switch wedding. Please try again.");
  }
}

export async function deleteActiveWedding(
  confirmation: unknown,
): Promise<WeddingActionResult<{ nextWeddingId: string | null }>> {
  if (typeof confirmation !== "string" || confirmation.trim().length === 0) {
    return failure("Type the wedding name to confirm deletion.");
  }

  try {
    const context = await requireOwner({ redirectToOnboarding: false });

    if (confirmation.trim() !== context.wedding.name) {
      return failure("The wedding name does not match.");
    }

    const deletion = await weddingRepository.deleteWedding(
      context.wedding.id,
      context.user.id,
    );
    revalidatePath("/", "layout");
    revalidatePath("/dashboard");
    revalidatePath("/checklist");
    revalidatePath("/settings");
    revalidatePath("/onboarding");

    return { success: true, data: deletion };
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return failure("Authentication is required.");
    }

    if (error instanceof ActiveWeddingRequiredError) {
      return failure("There is no active wedding to delete.");
    }

    if (error instanceof PermissionDeniedError) {
      return failure(error.message);
    }

    if (error instanceof WeddingRepositoryError) {
      return failure(error.message);
    }

    logger.error("[wedding] delete wedding failed", error);
    return failure("Unable to delete wedding. Please try again.");
  }
}
