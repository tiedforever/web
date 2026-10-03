"use server";

import { revalidatePath } from "next/cache";
import {
  GuestAgeGroup,
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
  GuestRepositoryError,
  guestRepository,
  type GuestFilters,
  type GuestInput,
  type PlusOneInput,
} from "../../repositories/guest.repository";
import {
  firstError,
  guestAgeGroups,
  parseEmail,
  parseEnum,
  parseId,
  parseOptionalBoolean,
  parseOptionalText,
  parsedValue,
  parseRecord,
  parseRequiredText,
} from "./validation";

export type GuestActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type GuestActionData = {
  id: string;
  weddingId: string;
  householdId: string | null;
  plusOneForGuestId: string | null;
  title: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  ageGroup: GuestAgeGroup;
  dietaryRequirements: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  household: HouseholdActionData | null;
  plusOneFor: GuestNameActionData | null;
  plusOnes: GuestPlusOneActionData[];
  tags: GuestTagActionData[];
  sections: GuestSectionActionData[];
};

export type GuestNameActionData = {
  id: string;
  firstName: string;
  lastName: string;
};

export type GuestPlusOneActionData = {
  id: string;
  title: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  ageGroup: GuestAgeGroup;
  tags: GuestTagActionData[];
  sections: GuestSectionActionData[];
};

export type GuestSectionActionData = {
  id: string;
  name: string;
  active: boolean;
};

export type HouseholdActionData = {
  id: string;
  weddingId: string;
  name: string;
  addressLineOne: string;
  addressLineTwo: string | null;
  townCity: string;
  countyRegion: string | null;
  postcode: string;
  country: string;
  notes: string | null;
};

export type GuestTagActionData = {
  id: string;
  name: string;
  colour: string | null;
  guestCount?: number;
};

type GuestRecord = Awaited<ReturnType<typeof guestRepository.getGuest>>;

function failure<T = never>(error: string): GuestActionResult<T> {
  return { success: false, error };
}

function serializeDate(value: Date) {
  return value.toISOString();
}

function mapGuestName(value: GuestRecord["plusOneFor"]): GuestNameActionData | null {
  return value
    ? { id: value.id, firstName: value.firstName, lastName: value.lastName }
    : null;
}

function mapGuest(guest: GuestRecord): GuestActionData {
  return {
    id: guest.id,
    weddingId: guest.weddingId,
    householdId: guest.householdId,
    plusOneForGuestId: guest.plusOneForGuestId,
    title: guest.title,
    firstName: guest.firstName,
    lastName: guest.lastName,
    email: guest.email,
    phone: guest.phone,
    ageGroup: guest.ageGroup,
    dietaryRequirements: guest.dietaryRequirements,
    notes: guest.notes,
    createdAt: serializeDate(guest.createdAt),
    updatedAt: serializeDate(guest.updatedAt),
    household: guest.household
      ? {
          id: guest.household.id,
          weddingId: guest.household.weddingId,
          name: guest.household.name,
          addressLineOne: guest.household.addressLineOne,
          addressLineTwo: guest.household.addressLineTwo,
          townCity: guest.household.townCity,
          countyRegion: guest.household.countyRegion,
          postcode: guest.household.postcode,
          country: guest.household.country,
          notes: guest.household.notes,
        }
      : null,
    plusOneFor: mapGuestName(guest.plusOneFor),
    plusOnes: guest.plusOnes.map((plusOne) => ({
      id: plusOne.id,
      title: plusOne.title,
      firstName: plusOne.firstName,
      lastName: plusOne.lastName,
      email: plusOne.email,
      phone: plusOne.phone,
      ageGroup: plusOne.ageGroup,
      tags: plusOne.tagAssignments.map(({ tag }) => ({
        id: tag.id,
        name: tag.name,
        colour: tag.colour,
      })),
      sections: plusOne.sectionAssignments.map(({ section }) => ({
        id: section.id,
        name: section.name,
        active: section.active,
      })),
    })),
    tags: guest.tagAssignments.map(({ tag }) => ({
      id: tag.id,
      name: tag.name,
      colour: tag.colour,
    })),
    sections: guest.sectionAssignments.map(({ section }) => ({
      id: section.id,
      name: section.name,
      active: section.active,
    })),
  };
}

function mapGuestList(guests: GuestRecord[]) {
  return guests.map(mapGuest);
}

function parseSectionIds(
  input: unknown,
): { value: string[] } | { error: string } {
  const sectionIdsValue = input ?? [];
  const sectionIds = Array.isArray(sectionIdsValue)
    ? sectionIdsValue.map((sectionId) => parseId(sectionId, "Wedding section"))
    : [{ error: "Wedding sections are invalid" }];
  const sectionError = sectionIds.find((result) => "error" in result);

  if (sectionError && "error" in sectionError) {
    return { error: sectionError.error };
  }

  const parsedSectionIds = sectionIds.map((sectionId) => parsedValue(sectionId));
  if (new Set(parsedSectionIds).size !== parsedSectionIds.length) {
    return { error: "A wedding section cannot be selected more than once" };
  }

  return { value: parsedSectionIds };
}

function mapGuestInput(input: unknown):
  | { value: GuestInput & { tagIds: string[]; sectionIds: string[] } }
  | { error: string } {
  const record = parseRecord(input);
  if ("error" in record) return record;

  const firstName = parseRequiredText(record.value.firstName, "First name", 100);
  const lastName = parseRequiredText(record.value.lastName, "Last name", 100);
  const title = parseOptionalText(record.value.title, "Title", 30);
  const email = parseEmail(record.value.email);
  const phone = parseOptionalText(record.value.phone, "Phone", 50);
  const dietaryRequirements = parseOptionalText(
    record.value.dietaryRequirements,
    "Dietary requirements",
    2_000,
  );
  const notes = parseOptionalText(record.value.notes, "Notes", 2_000);
  const householdId =
    record.value.householdId === null || record.value.householdId === ""
      ? { value: null }
      : record.value.householdId === undefined
        ? { value: null }
        : parseId(record.value.householdId, "Household");
  const plusOneForGuestId =
    record.value.plusOneForGuestId === null ||
    record.value.plusOneForGuestId === ""
      ? { value: null }
      : record.value.plusOneForGuestId === undefined
        ? { value: null }
        : parseId(record.value.plusOneForGuestId, "Plus-one target");
  const ageGroup = parseEnum(
    record.value.ageGroup ?? GuestAgeGroup.ADULT,
    "Age group",
    guestAgeGroups,
  );

  const tagIdsValue = record.value.tagIds ?? [];
  const tagIds = Array.isArray(tagIdsValue)
    ? tagIdsValue.map((tagId) => parseId(tagId, "Tag"))
    : [{ error: "Tags are invalid" }];
  const tagError = tagIds.find((result) => "error" in result);

  const sectionIds = parseSectionIds(record.value.sectionIds);

  const error = firstError(
    firstName,
    lastName,
    title,
    email,
    phone,
    dietaryRequirements,
    notes,
    householdId,
    plusOneForGuestId,
    ageGroup,
    tagError ?? {},
    sectionIds,
  );

  if (error) return { error };

  return {
    value: {
      firstName: parsedValue(firstName) as string,
      lastName: parsedValue(lastName) as string,
      title: parsedValue(title) as string | null,
      email: parsedValue(email) as string | null,
      phone: parsedValue(phone) as string | null,
      dietaryRequirements: parsedValue(dietaryRequirements) as string | null,
      notes: parsedValue(notes) as string | null,
      householdId: parsedValue(householdId) as string | null,
      plusOneForGuestId: parsedValue(plusOneForGuestId) as string | null,
      ageGroup: parsedValue(ageGroup) as GuestAgeGroup,
      tagIds: tagIds.map((tagId) => parsedValue(tagId) as string),
      sectionIds: parsedValue(sectionIds),
    },
  };
}

function parseOptionalPlusOne(input: unknown):
  | { value: { input: PlusOneInput; sectionIds: string[] } | null }
  | { error: string } {
  if (input === undefined || input === null) return { value: null };

  const record = parseRecord(input);
  if ("error" in record) return record;
  const sectionIds = parseSectionIds(record.value.sectionIds);
  if ("error" in sectionIds) return sectionIds;
  const hasAnyValue = [
    record.value.firstName,
    record.value.lastName,
    record.value.email,
    record.value.phone,
    record.value.dietaryRequirements,
    record.value.notes,
  ].some((value) => typeof value === "string" && value.trim().length > 0) ||
    sectionIds.value.length > 0;

  if (!hasAnyValue) return { value: null };

  const firstName = parseRequiredText(record.value.firstName, "Plus-one first name", 100);
  const lastName = parseRequiredText(record.value.lastName, "Plus-one last name", 100);
  const email = parseEmail(record.value.email);
  const phone = parseOptionalText(record.value.phone, "Plus-one phone", 50);
  const ageGroup = parseEnum(
    record.value.ageGroup ?? GuestAgeGroup.ADULT,
    "Plus-one age group",
    guestAgeGroups,
  );
  const dietaryRequirements = parseOptionalText(
    record.value.dietaryRequirements,
    "Plus-one dietary requirements",
    2_000,
  );
  const notes = parseOptionalText(record.value.notes, "Plus-one notes", 2_000);
  const error = firstError(
    firstName,
    lastName,
    email,
    phone,
    ageGroup,
    dietaryRequirements,
    notes,
    sectionIds,
  );

  if (error) return { error };

  return {
    value: {
      input: {
        firstName: parsedValue(firstName) as string,
        lastName: parsedValue(lastName) as string,
        title: null,
        email: parsedValue(email) as string | null,
        phone: parsedValue(phone) as string | null,
        ageGroup: parsedValue(ageGroup) as GuestAgeGroup,
        dietaryRequirements: parsedValue(dietaryRequirements) as string | null,
        notes: parsedValue(notes) as string | null,
      },
      sectionIds: sectionIds.value,
    },
  };
}

function revalidateGuestPaths(
  guestIds?: string | readonly string[],
  options: { dashboard?: boolean } = {},
) {
  revalidatePath("/guests");
  revalidatePath("/guests/households");
  if (options.dashboard) revalidatePath("/dashboard");

  const ids = guestIds === undefined
    ? []
    : Array.isArray(guestIds)
      ? guestIds
      : [guestIds];

  for (const guestId of new Set(ids)) {
    revalidatePath(`/guests/${guestId}`);
  }
}

async function runGuestAction<T>(
  actionName: string,
  access: "read" | "edit",
  operation: (weddingId: string) => Promise<T>,
): Promise<GuestActionResult<T>> {
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
      return failure("Create or select a wedding before managing guests.");
    }
    if (error instanceof PermissionDeniedError) {
      return failure(error.message);
    }
    if (error instanceof GuestRepositoryError) {
      return failure(error.message);
    }
    logger.error(`[guests] ${actionName} failed`, error);
    return failure(`Unable to ${actionName}. Please try again.`);
  }
}

export type GuestListFiltersInput = {
  search?: unknown;
  householdId?: unknown;
  ageGroup?: unknown;
  tagId?: unknown;
  unassignedHousehold?: unknown;
};

function parseFilters(input: GuestListFiltersInput = {}):
  | { value: GuestFilters }
  | { error: string } {
  const search = parseOptionalText(input.search, "Search", 100);
  const householdId =
    input.householdId === undefined || input.householdId === ""
      ? { value: undefined }
      : parseId(input.householdId, "Household");
  const tagId =
    input.tagId === undefined || input.tagId === ""
      ? { value: undefined }
      : parseId(input.tagId, "Tag");
  const ageGroup =
    input.ageGroup === undefined || input.ageGroup === ""
      ? { value: undefined }
      : parseEnum(input.ageGroup, "Age group", guestAgeGroups);
  const unassignedHousehold = parseOptionalBoolean(input.unassignedHousehold);
  const error = firstError(search, householdId, tagId, ageGroup, unassignedHousehold);

  if (error) return { error };

  return {
    value: {
      search: parsedValue(search) ?? undefined,
      householdId: parsedValue(householdId),
      ageGroup: parsedValue(ageGroup),
      tagId: parsedValue(tagId),
      unassignedHousehold: parsedValue(unassignedHousehold),
    },
  };
}

export async function getGuests(
  filters: GuestListFiltersInput = {},
): Promise<GuestActionResult<GuestActionData[]>> {
  const parsed = parseFilters(filters);
  if ("error" in parsed) return failure(parsed.error);

  return runGuestAction("load guests", "read", async (weddingId) =>
    mapGuestList(await guestRepository.listGuests(weddingId, parsed.value)),
  );
}

export async function getStandaloneGuests(
  filters: GuestListFiltersInput = {},
): Promise<GuestActionResult<GuestActionData[]>> {
  const parsed = parseFilters(filters);
  if ("error" in parsed) return failure(parsed.error);

  return runGuestAction("load standalone guests", "read", async (weddingId) =>
    mapGuestList(await guestRepository.listStandaloneGuests(weddingId, parsed.value)),
  );
}

export async function getGuest(
  guestId: unknown,
): Promise<GuestActionResult<GuestActionData>> {
  const parsedId = parseId(guestId, "Guest");
  if ("error" in parsedId) return failure(parsedId.error);

  return runGuestAction("load guest", "read", async (weddingId) =>
    mapGuest(await guestRepository.getGuest(weddingId, parsedValue(parsedId))),
  );
}

export async function createGuest(
  input: unknown,
): Promise<GuestActionResult<GuestActionData>> {
  const parsed = mapGuestInput(input);
  if ("error" in parsed) return failure(parsed.error);
  const record = parseRecord(input);
  if ("error" in record) return failure(record.error);
  const plusOne = parseOptionalPlusOne(record.value.plusOne);
  if ("error" in plusOne) return failure(plusOne.error);

  return runGuestAction("create guest", "edit", async (weddingId) => {
    const { tagIds, sectionIds, ...guestInput } = parsed.value;
    const plusOneInput = parsedValue(plusOne);
    const guest = await guestRepository.createGuestWithPlusOne(weddingId, {
      primary: guestInput,
      plusOne: plusOneInput?.input ?? null,
      primaryTagIds: tagIds,
      primarySectionIds: sectionIds,
      plusOneSectionIds: plusOneInput?.sectionIds,
    });
    revalidateGuestPaths(guest.id, { dashboard: true });
    return mapGuest(guest);
  });
}

export async function addPlusOne(
  guestId: unknown,
  input: unknown,
): Promise<GuestActionResult<GuestActionData>> {
  const parsedId = parseId(guestId, "Guest");
  if ("error" in parsedId) return failure(parsedId.error);

  const parsed = parseOptionalPlusOne(input);
  if ("error" in parsed) return failure(parsed.error);
  const plusOne = parsedValue(parsed);
  if (!plusOne) return failure("Plus-one first and last name are required");

  return runGuestAction("add plus-one", "edit", async (weddingId) => {
    const guest = await guestRepository.addPlusOne(
      weddingId,
      parsedValue(parsedId),
      plusOne.input,
      plusOne.sectionIds,
    );
    revalidateGuestPaths(guest.id, { dashboard: true });
    return mapGuest(guest);
  });
}

export async function attachExistingGuestAsPlusOne(
  parentGuestId: unknown,
  plusOneGuestId: unknown,
): Promise<GuestActionResult<GuestActionData>> {
  const parsedParentId = parseId(parentGuestId, "Guest");
  const parsedPlusOneId = parseId(plusOneGuestId, "Existing guest");
  const error = firstError(parsedParentId, parsedPlusOneId);
  if (error) return failure(error);

  return runGuestAction("attach existing plus-one", "edit", async (weddingId) => {
    const guest = await guestRepository.attachExistingGuestAsPlusOne(
      weddingId,
      parsedValue(parsedParentId),
      parsedValue(parsedPlusOneId),
    );
    revalidateGuestPaths([
      parsedValue(parsedParentId),
      parsedValue(parsedPlusOneId),
    ]);
    return mapGuest(guest);
  });
}

export async function updateGuest(
  guestId: unknown,
  input: unknown,
): Promise<GuestActionResult<GuestActionData>> {
  const parsedId = parseId(guestId, "Guest");
  if ("error" in parsedId) return failure(parsedId.error);
  const parsed = mapGuestInput(input);
  if ("error" in parsed) return failure(parsed.error);
  const record = parseRecord(input);
  if ("error" in record) return failure(record.error);

  return runGuestAction("update guest", "edit", async (weddingId) => {
    const { tagIds, sectionIds: parsedSectionIds, ...guestInput } = parsed.value;
    const sectionIds = "sectionIds" in record.value ? parsedSectionIds : undefined;
    const guest = await guestRepository.updateGuest(
      weddingId,
      parsedValue(parsedId),
      guestInput,
      tagIds,
      sectionIds,
    );
    revalidateGuestPaths(guest.id, { dashboard: true });
    return mapGuest(guest);
  });
}

export async function deleteGuest(
  guestId: unknown,
): Promise<GuestActionResult<null>> {
  const parsedId = parseId(guestId, "Guest");
  if ("error" in parsedId) return failure(parsedId.error);

  return runGuestAction("delete guest", "edit", async (weddingId) => {
    await guestRepository.deleteGuest(weddingId, parsedValue(parsedId));
    revalidateGuestPaths(parsedValue(parsedId), { dashboard: true });
    return null;
  });
}

export async function removePlusOneRelationship(
  guestId: unknown,
): Promise<GuestActionResult<GuestActionData>> {
  const parsedId = parseId(guestId, "Guest");
  if ("error" in parsedId) return failure(parsedId.error);

  return runGuestAction("remove plus-one relationship", "edit", async (weddingId) => {
    const guest = await guestRepository.removePlusOneRelationship(
      weddingId,
      parsedValue(parsedId),
    );
    revalidateGuestPaths(guest.id);
    return mapGuest(guest);
  });
}

export async function assignGuestToHousehold(
  guestId: unknown,
  householdId: unknown,
): Promise<GuestActionResult<GuestActionData>> {
  const parsedGuestId = parseId(guestId, "Guest");
  const parsedHouseholdId = parseId(householdId, "Household");
  const error = firstError(parsedGuestId, parsedHouseholdId);
  if (error) return failure(error);

  return runGuestAction("assign guest to household", "edit", async (weddingId) => {
    const guest = await guestRepository.assignGuestToHousehold(
      weddingId,
      parsedValue(parsedGuestId),
      parsedValue(parsedHouseholdId),
    );
    revalidateGuestPaths(guest.id, { dashboard: true });
    return mapGuest(guest);
  });
}

export async function removeGuestFromHousehold(
  guestId: unknown,
): Promise<GuestActionResult<GuestActionData>> {
  const parsedGuestId = parseId(guestId, "Guest");
  if ("error" in parsedGuestId) return failure(parsedGuestId.error);

  return runGuestAction("remove guest from household", "edit", async (weddingId) => {
    const guest = await guestRepository.removeGuestFromHousehold(
      weddingId,
      parsedValue(parsedGuestId),
    );
    revalidateGuestPaths(guest.id, { dashboard: true });
    return mapGuest(guest);
  });
}

export async function updateGuestTags(
  guestId: unknown,
  tagIds: unknown,
): Promise<GuestActionResult<GuestActionData>> {
  const parsedGuestId = parseId(guestId, "Guest");
  if ("error" in parsedGuestId) return failure(parsedGuestId.error);
  if (!Array.isArray(tagIds)) return failure("Tags are invalid");

  const parsedTagIds = tagIds.map((tagId) => parseId(tagId, "Tag"));
  const tagError = parsedTagIds.find((tagId) => "error" in tagId);
  if (tagError && "error" in tagError) return failure(tagError.error);

  return runGuestAction("update guest tags", "edit", async (weddingId) => {
    const guest = await guestRepository.setGuestTags(
      weddingId,
      parsedValue(parsedGuestId),
      parsedTagIds.map((tagId) => parsedValue(tagId)),
    );
    revalidateGuestPaths(guest.id);
    return mapGuest(guest);
  });
}

export async function getGuestByIdForServer(
  guestId: string,
): Promise<GuestActionResult<GuestActionData>> {
  return getGuest(guestId);
}
