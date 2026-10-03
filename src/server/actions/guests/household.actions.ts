"use server";

import { revalidatePath } from "next/cache";
import { GuestAgeGroup } from "../../../../app/generated/prisma/client";
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
  HouseholdRepositoryError,
  householdRepository,
  type HouseholdGuestInput,
  type HouseholdFilters,
  type HouseholdInput,
} from "../../repositories/household.repository";
import {
  firstError,
  guestAgeGroups,
  parseEmail,
  parseEnum,
  parseId,
  parseOptionalText,
  parseOptionalBoolean,
  parsedValue,
  parseRecord,
  parseRequiredText,
} from "./validation";

export type HouseholdActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type HouseholdGuestActionData = {
  id: string;
  title: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  ageGroup: string;
  dietaryRequirements: string | null;
  notes: string | null;
  plusOneFor: { id: string; firstName: string; lastName: string } | null;
  plusOnes: { id: string; firstName: string; lastName: string }[];
  tags: { id: string; name: string; colour: string | null }[];
};

export type HouseholdData = {
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
  primaryGuestId: string | null;
  primaryGuest: { id: string; firstName: string; lastName: string } | null;
  guests: HouseholdGuestActionData[];
  createdAt: string;
  updatedAt: string;
};

type HouseholdRecord = Awaited<ReturnType<typeof householdRepository.getHousehold>>;

function failure<T = never>(error: string): HouseholdActionResult<T> {
  return { success: false, error };
}

function mapHousehold(household: HouseholdRecord): HouseholdData {
  return {
    id: household.id,
    weddingId: household.weddingId,
    name: household.name,
    addressLineOne: household.addressLineOne,
    addressLineTwo: household.addressLineTwo,
    townCity: household.townCity,
    countyRegion: household.countyRegion,
    postcode: household.postcode,
    country: household.country,
    notes: household.notes,
    primaryGuestId: household.primaryGuestId,
    primaryGuest: household.primaryGuest,
    createdAt: household.createdAt.toISOString(),
    updatedAt: household.updatedAt.toISOString(),
    guests: household.guests.map((guest) => ({
      id: guest.id,
      title: guest.title,
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
      phone: guest.phone,
      ageGroup: guest.ageGroup,
      dietaryRequirements: guest.dietaryRequirements,
      notes: guest.notes,
      plusOneFor: guest.plusOneFor,
      plusOnes: guest.plusOnes,
      tags: guest.tagAssignments.map(({ tag }) => ({
        id: tag.id,
        name: tag.name,
        colour: tag.colour,
      })),
    })),
  };
}

function mapHouseholds(households: HouseholdRecord[]) {
  return households.map(mapHousehold);
}

export type HouseholdListFiltersInput = {
  search?: unknown;
  householdId?: unknown;
  ageGroup?: unknown;
  tagId?: unknown;
  unassignedHousehold?: unknown;
};

function parseHouseholdFilters(
  input: HouseholdListFiltersInput = {},
): { value: HouseholdFilters } | { error: string } {
  const search = parseOptionalText(input.search, "Search", 100);
  const householdId =
    input.householdId === undefined || input.householdId === ""
      ? { value: undefined }
      : parseId(input.householdId, "Household");
  const ageGroup =
    input.ageGroup === undefined || input.ageGroup === ""
      ? { value: undefined }
      : parseEnum(input.ageGroup, "Age group", guestAgeGroups);
  const tagId =
    input.tagId === undefined || input.tagId === ""
      ? { value: undefined }
      : parseId(input.tagId, "Tag");
  const unassignedHousehold = parseOptionalBoolean(input.unassignedHousehold);
  const error = firstError(
    search,
    householdId,
    ageGroup,
    tagId,
    unassignedHousehold,
  );

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

function parseHouseholdInput(input: unknown):
  | { value: HouseholdInput }
  | { error: string } {
  const record = parseRecord(input);
  if ("error" in record) return record;

  const name = parseRequiredText(record.value.name, "Household name", 150);
  const addressLineOne = parseRequiredText(
    record.value.addressLineOne,
    "Address line one",
    200,
  );
  const addressLineTwo = parseOptionalText(
    record.value.addressLineTwo,
    "Address line two",
    200,
  );
  const townCity = parseRequiredText(record.value.townCity, "Town or city", 100);
  const countyRegion = parseOptionalText(
    record.value.countyRegion,
    "County or region",
    100,
  );
  const postcode = parseRequiredText(record.value.postcode, "Postcode", 30);
  const country = parseRequiredText(record.value.country, "Country", 100);
  const notes = parseOptionalText(record.value.notes, "Notes", 2_000);
  const error = firstError(
    name,
    addressLineOne,
    addressLineTwo,
    townCity,
    countyRegion,
    postcode,
    country,
    notes,
  );

  if (error) return { error };

  return {
    value: {
      name: parsedValue(name) as string,
      addressLineOne: parsedValue(addressLineOne) as string,
      addressLineTwo: parsedValue(addressLineTwo) as string | null,
      townCity: parsedValue(townCity) as string,
      countyRegion: parsedValue(countyRegion) as string | null,
      postcode: parsedValue(postcode) as string,
      country: parsedValue(country) as string,
      notes: parsedValue(notes) as string | null,
    },
  };
}

type ParsedHouseholdCreation = {
  household: HouseholdInput;
  guests: HouseholdGuestInput[];
  primaryGuestIndex: number;
};

function parseHouseholdMember(
  input: unknown,
  index: number,
): { value: HouseholdGuestInput } | { error: string } {
  const record = parseRecord(input);
  if ("error" in record) return record;

  const firstName = parseRequiredText(record.value.firstName, "First name", 100);
  const lastName = parseRequiredText(record.value.lastName, "Last name", 100);
  const title =
    index === 0
      ? parseOptionalText(record.value.title, "Title", 30)
      : { value: null };
  const email = parseEmail(record.value.email);
  const phone = parseOptionalText(record.value.phone, "Phone", 50);
  const dietaryRequirements = parseOptionalText(
    record.value.dietaryRequirements,
    "Dietary requirements",
    2_000,
  );
  const notes = parseOptionalText(record.value.notes, "Notes", 2_000);
  const ageGroup = parseEnum(
    record.value.ageGroup ?? GuestAgeGroup.ADULT,
    "Age group",
    guestAgeGroups,
  );
  const tagValues = record.value.tagIds ?? [];
  const tagIds = Array.isArray(tagValues)
    ? tagValues.map((tagId) => parseId(tagId, "Tag"))
    : [{ error: "Tags are invalid" }];
  const tagError = tagIds.find((tagId) => "error" in tagId);
  const error = firstError(
    firstName,
    lastName,
    title,
    email,
    phone,
    dietaryRequirements,
    notes,
    ageGroup,
    tagError ?? {},
  );

  if (error) return { error };

  return {
    value: {
      title: parsedValue(title) as string | null,
      firstName: parsedValue(firstName) as string,
      lastName: parsedValue(lastName) as string,
      email: parsedValue(email) as string | null,
      phone: parsedValue(phone) as string | null,
      ageGroup: parsedValue(ageGroup),
      dietaryRequirements: parsedValue(dietaryRequirements) as string | null,
      notes: parsedValue(notes) as string | null,
      tagIds: tagIds.map((tagId) => parsedValue(tagId) as string),
    },
  };
}

function parseHouseholdCreationInput(input: unknown):
  | { value: ParsedHouseholdCreation }
  | { error: string } {
  const record = parseRecord(input);
  if ("error" in record) return record;

  const household = parseHouseholdInput(record.value);
  if ("error" in household) return household;

  const rawMemberCount = record.value.memberCount;
  const memberCount =
    typeof rawMemberCount === "number"
      ? rawMemberCount
      : typeof rawMemberCount === "string" && rawMemberCount.trim() !== ""
        ? Number(rawMemberCount)
        : Number.NaN;
  const members = record.value.members;

  if (!Number.isInteger(memberCount) || memberCount < 1 || memberCount > 20) {
    return { error: "Household members must be between 1 and 20" };
  }

  if (!Array.isArray(members) || members.length !== memberCount) {
    return { error: "Household member details are incomplete" };
  }

  const parsedMembers = members.map((member, index) =>
    parseHouseholdMember(member, index),
  );
  const memberError = parsedMembers.find((member) => "error" in member);
  if (memberError && "error" in memberError) {
    return { error: memberError.error };
  }

  return {
    value: {
      household: household.value,
      guests: parsedMembers.map((member) => parsedValue(member)),
      primaryGuestIndex: 0,
    },
  };
}

function parseGuestIds(
  value: unknown,
): { value: string[] } | { error: string } {
  if (!Array.isArray(value) || value.length === 0) {
    return { error: "Select at least one guest" };
  }

  const ids = value.map((guestId) => parseId(guestId, "Guest"));
  const error = ids.find((id) => "error" in id);
  if (error && "error" in error) return { error: error.error };

  return { value: ids.map((id) => parsedValue(id) as string) };
}

function revalidateHouseholdPaths(
  householdId?: string,
  options: { dashboard?: boolean } = {},
) {
  revalidatePath("/guests");
  revalidatePath("/guests/households");
  if (options.dashboard) revalidatePath("/dashboard");
  if (householdId) revalidatePath(`/guests/households/${householdId}`);
}

async function runHouseholdAction<T>(
  actionName: string,
  access: "read" | "edit",
  operation: (weddingId: string) => Promise<T>,
): Promise<HouseholdActionResult<T>> {
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
      return failure("Create or select a wedding before managing households.");
    }
    if (error instanceof PermissionDeniedError) {
      return failure(error.message);
    }
    if (error instanceof HouseholdRepositoryError) {
      return failure(error.message);
    }

    logger.error(`[households] ${actionName} failed`, error);
    return failure(`Unable to ${actionName}. Please try again.`);
  }
}

export async function getHouseholds(
  filters: HouseholdListFiltersInput = {},
): Promise<
  HouseholdActionResult<HouseholdData[]>
> {
  const parsed = parseHouseholdFilters(filters);
  if ("error" in parsed) return failure(parsed.error);

  return runHouseholdAction("load households", "read", async (weddingId) =>
    mapHouseholds(await householdRepository.listHouseholds(weddingId, parsed.value)),
  );
}

export async function getHousehold(
  householdId: unknown,
): Promise<HouseholdActionResult<HouseholdData>> {
  const parsedId = parseId(householdId, "Household");
  if ("error" in parsedId) return failure(parsedId.error);

  return runHouseholdAction("load household", "read", async (weddingId) =>
    mapHousehold(
      await householdRepository.getHousehold(weddingId, parsedValue(parsedId)),
    ),
  );
}

export async function createHousehold(
  input: unknown,
): Promise<HouseholdActionResult<HouseholdData>> {
  const parsed = parseHouseholdInput(input);
  if ("error" in parsed) return failure(parsed.error);

  return runHouseholdAction("create household", "edit", async () => {
    throw new HouseholdRepositoryError(
      "A household must be created with at least one guest",
    );
  });
}

export async function createHouseholdWithMembers(
  input: unknown,
): Promise<HouseholdActionResult<HouseholdData>> {
  const parsed = parseHouseholdCreationInput(input);
  if ("error" in parsed) return failure(parsed.error);

  return runHouseholdAction(
    "create household and guests",
    "edit",
    async (weddingId) => {
      const household = await householdRepository.createHouseholdWithGuests(
        weddingId,
        parsed.value,
      );
      revalidateHouseholdPaths(household.id, { dashboard: true });
      return mapHousehold(household);
    },
  );
}

export async function updateHousehold(
  householdId: unknown,
  input: unknown,
): Promise<HouseholdActionResult<HouseholdData>> {
  const parsedId = parseId(householdId, "Household");
  if ("error" in parsedId) return failure(parsedId.error);
  const parsed = parseHouseholdInput(input);
  if ("error" in parsed) return failure(parsed.error);

  return runHouseholdAction("update household", "edit", async (weddingId) => {
    const household = await householdRepository.updateHousehold(
      weddingId,
      parsedValue(parsedId),
      parsed.value,
    );
    revalidateHouseholdPaths(household.id);
    return mapHousehold(household);
  });
}

export async function deleteHousehold(
  householdId: unknown,
): Promise<HouseholdActionResult<null>> {
  const parsedId = parseId(householdId, "Household");
  if ("error" in parsedId) return failure(parsedId.error);

  return runHouseholdAction("delete household", "edit", async (weddingId) => {
    await householdRepository.deleteHousehold(weddingId, parsedValue(parsedId));
    revalidateHouseholdPaths(parsedValue(parsedId), { dashboard: true });
    return null;
  });
}

export async function setHouseholdPrimaryGuest(
  householdId: unknown,
  guestId: unknown,
): Promise<HouseholdActionResult<HouseholdData>> {
  const parsedHouseholdId = parseId(householdId, "Household");
  if ("error" in parsedHouseholdId) return failure(parsedHouseholdId.error);

  const parsedGuestId =
    guestId === null || guestId === "" || guestId === undefined
      ? { value: null }
      : parseId(guestId, "Guest");
  if ("error" in parsedGuestId) return failure(parsedGuestId.error);

  return runHouseholdAction(
    "update primary invitee",
    "edit",
    async (weddingId) => {
      const household = await householdRepository.setPrimaryGuest(
        weddingId,
        parsedValue(parsedHouseholdId),
        parsedValue(parsedGuestId),
      );
      revalidateHouseholdPaths(household.id);
      return mapHousehold(household);
    },
  );
}

export async function addGuestsToHousehold(
  householdId: unknown,
  guestIds: unknown,
): Promise<HouseholdActionResult<HouseholdData>> {
  const parsedHouseholdId = parseId(householdId, "Household");
  if ("error" in parsedHouseholdId) return failure(parsedHouseholdId.error);
  const parsedGuestIds = parseGuestIds(guestIds);
  if ("error" in parsedGuestIds) return failure(parsedGuestIds.error);

  return runHouseholdAction("add guests to household", "edit", async (weddingId) => {
    const household = await householdRepository.addGuestsToHousehold(
      weddingId,
      parsedValue(parsedHouseholdId),
      parsedValue(parsedGuestIds),
    );
    revalidateHouseholdPaths(household.id, { dashboard: true });
    return mapHousehold(household);
  });
}

export async function removeGuestsFromHousehold(
  householdId: unknown,
  guestIds: unknown,
): Promise<HouseholdActionResult<HouseholdData>> {
  const parsedHouseholdId = parseId(householdId, "Household");
  if ("error" in parsedHouseholdId) return failure(parsedHouseholdId.error);
  const parsedGuestIds = parseGuestIds(guestIds);
  if ("error" in parsedGuestIds) return failure(parsedGuestIds.error);

  return runHouseholdAction(
    "remove guests from household",
    "edit",
    async (weddingId) => {
      const household = await householdRepository.removeGuestsFromHousehold(
        weddingId,
        parsedValue(parsedHouseholdId),
        parsedValue(parsedGuestIds),
      );
      revalidateHouseholdPaths(household.id, { dashboard: true });
      return mapHousehold(household);
    },
  );
}
