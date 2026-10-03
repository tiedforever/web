import "dotenv/config";

import {
  GuestAgeGroup,
  PrismaClient,
  TaskPriority,
  TaskStatus,
} from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const isProductionEnvironment =
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL_ENV === "production";

if (isProductionEnvironment) {
  throw new Error("The development seed cannot run in Production.");
}

const DEVELOPMENT_USER_AUTH_PROVIDER_ID = "dev-user-ethan";
const DEVELOPMENT_USER_EMAIL = "dev-user@example.local";
const DEVELOPMENT_WEDDING_NAME = "Ethan & Emily's Wedding";
const DEVELOPMENT_PARTNER_ONE_NAME = "Ethan";
const DEVELOPMENT_PARTNER_TWO_NAME = "Emily";
const DEVELOPMENT_WEDDING_DATE = "2027-12-18";
const DEVELOPMENT_CEREMONY_LOCATION = "Ballyclare Presbyterian Church";
const DEVELOPMENT_RECEPTION_LOCATION = "Tullyglass Hotel";
const DEVELOPMENT_TIMEZONE = "Europe/London";
const DEVELOPMENT_CURRENCY_CODE = "GBP";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required to run the development seed. Start Prisma Postgres and try again.",
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const developmentWeddingDate = new Date(
  `${DEVELOPMENT_WEDDING_DATE}T00:00:00.000Z`,
);
const developmentMembershipJoinedAt = new Date(
  "2026-08-03T09:00:00.000Z",
);

const categoryDefinitions = [
  { name: "Venue", position: 0 },
  { name: "Guests", position: 1 },
  { name: "Photography", position: 2 },
  { name: "Entertainment", position: 3 },
  { name: "Ceremony", position: 4 },
] as const;

const taskDefinitions = [
  {
    categoryName: "Venue",
    title: "Confirm final package details",
    description: "Review the final inclusions and timings with the venue team.",
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    dueDate: "2027-02-12",
    position: 0,
  },
  {
    categoryName: "Venue",
    title: "Pay venue deposit",
    description: "Make the next scheduled venue payment.",
    status: TaskStatus.NOT_STARTED,
    priority: TaskPriority.URGENT,
    dueDate: "2027-03-01",
    position: 1,
  },
  {
    categoryName: "Guests",
    title: "Draft guest list",
    description: "Create the first complete version of the guest list.",
    status: TaskStatus.COMPLETED,
    priority: TaskPriority.HIGH,
    dueDate: "2026-10-15",
    position: 0,
  },
  {
    categoryName: "Guests",
    title: "Confirm household addresses",
    description: "Check postal addresses before invitations are ordered.",
    status: TaskStatus.NOT_STARTED,
    priority: TaskPriority.MEDIUM,
    dueDate: "2027-01-20",
    position: 1,
  },
  {
    categoryName: "Photography",
    title: "Compare photography packages",
    description: "Compare coverage, albums, and final delivery dates.",
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    dueDate: "2026-11-30",
    position: 0,
  },
  {
    categoryName: "Entertainment",
    title: "Contact wedding bands",
    description: "Ask for availability and package information.",
    status: TaskStatus.NOT_STARTED,
    priority: TaskPriority.MEDIUM,
    dueDate: "2026-12-10",
    position: 0,
  },
  {
    categoryName: "Ceremony",
    title: "Meet with minister",
    description: "Arrange the ceremony planning meeting.",
    status: TaskStatus.COMPLETED,
    priority: TaskPriority.HIGH,
    dueDate: "2026-09-20",
    position: 0,
  },
  {
    categoryName: "Ceremony",
    title: "Confirm order of service",
    description: "Agree the readings, music, and ceremony sequence.",
    status: TaskStatus.NOT_STARTED,
    priority: TaskPriority.MEDIUM,
    dueDate: "2027-05-15",
    position: 1,
  },
] as const;

const householdDefinitions = [
  {
    name: "Boyd Household",
    addressLineOne: "14 Church Road",
    addressLineTwo: null,
    townCity: "Ballyclare",
    countyRegion: "County Antrim",
    postcode: "BT39 9AA",
    country: "United Kingdom",
    notes: "Family household for development planning.",
  },
  {
    name: "Smith Household",
    addressLineOne: "8 Willow Park",
    addressLineTwo: null,
    townCity: "Belfast",
    countyRegion: "County Antrim",
    postcode: "BT9 4BD",
    country: "United Kingdom",
    notes: null,
  },
  {
    name: "McAllister Family",
    addressLineOne: "22 The Orchard",
    addressLineTwo: "Apartment 3",
    townCity: "Antrim",
    countyRegion: "County Antrim",
    postcode: "BT41 2EF",
    country: "United Kingdom",
    notes: "Please use the side entrance for deliveries.",
  },
] as const;

const guestTagDefinitions = [
  { name: "Ethan’s family", colour: "#2D5A27" },
  { name: "Emily’s family", colour: "#9A6E30" },
  { name: "Friends", colour: "#4A7C57" },
  { name: "Church", colour: "#6B6B63" },
  { name: "Work", colour: "#B07C1A" },
] as const;

const guestDefinitions = [
  {
    key: "oliver-boyd",
    householdName: "Boyd Household",
    title: "Mr",
    firstName: "Oliver",
    lastName: "Boyd",
    email: "oliver.boyd@example.local",
    phone: "+44 7700 900101",
    ageGroup: GuestAgeGroup.ADULT,
    dietaryRequirements: null,
    notes: null,
    tags: ["Ethan’s family", "Church"],
  },
  {
    key: "grace-boyd",
    householdName: "Boyd Household",
    title: "Mrs",
    firstName: "Grace",
    lastName: "Boyd",
    email: "grace.boyd@example.local",
    phone: null,
    ageGroup: GuestAgeGroup.ADULT,
    dietaryRequirements: "Vegetarian",
    notes: "Would prefer a quiet seat during the meal.",
    tags: ["Ethan’s family"],
  },
  {
    key: "lucas-boyd",
    householdName: "Boyd Household",
    title: null,
    firstName: "Lucas",
    lastName: "Boyd",
    email: null,
    phone: null,
    ageGroup: GuestAgeGroup.CHILD,
    dietaryRequirements: null,
    notes: "Child guest.",
    tags: ["Ethan’s family"],
  },
  {
    key: "sarah-smith",
    householdName: "Smith Household",
    title: "Ms",
    firstName: "Sarah",
    lastName: "Smith",
    email: "sarah.smith@example.local",
    phone: "+44 7700 900102",
    ageGroup: GuestAgeGroup.ADULT,
    dietaryRequirements: "No dairy",
    notes: null,
    tags: ["Emily’s family"],
  },
  {
    key: "daniel-murphy",
    householdName: "McAllister Family",
    title: "Mr",
    firstName: "Daniel",
    lastName: "Murphy",
    email: "daniel.murphy@example.local",
    phone: null,
    ageGroup: GuestAgeGroup.ADULT,
    dietaryRequirements: null,
    notes: "Friend of the couple.",
    tags: ["Friends", "Work"],
  },
  {
    key: "ava-murphy",
    householdName: "McAllister Family",
    title: "Ms",
    firstName: "Ava",
    lastName: "Murphy",
    email: "ava.murphy@example.local",
    phone: null,
    ageGroup: GuestAgeGroup.ADULT,
    dietaryRequirements: null,
    notes: "Plus-one of Daniel Murphy.",
    plusOneForKey: "daniel-murphy",
    tags: ["Friends"],
  },
  {
    key: "noah-campbell",
    householdName: null,
    title: "Mr",
    firstName: "Noah",
    lastName: "Campbell",
    email: null,
    phone: "+44 7700 900103",
    ageGroup: GuestAgeGroup.ADULT,
    dietaryRequirements: null,
    notes: "Household to be confirmed.",
    tags: ["Work"],
  },
  {
    key: "mia-campbell",
    householdName: null,
    title: null,
    firstName: "Mia",
    lastName: "Campbell",
    email: null,
    phone: null,
    ageGroup: GuestAgeGroup.INFANT,
    dietaryRequirements: null,
    notes: "Infant guest.",
    tags: ["Friends"],
  },
] as const;

const weddingSectionDefinitions = [
  { name: "Ceremony", description: null, position: 0 },
  { name: "Venue", description: null, position: 1 },
] as const;

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function main() {
    const existingEmailUser = await prisma.user.findUnique({
      where: { email: DEVELOPMENT_USER_EMAIL },
    });
    const existingSeedUser = await prisma.user.findUnique({
      where: { authProviderId: DEVELOPMENT_USER_AUTH_PROVIDER_ID },
    });

    // Prefer an existing verified/Clerk-synchronised user with this email.
    // This keeps the seed compatible with a real local account and avoids
    // changing its external authentication identifier.
    const user = existingEmailUser
      ? existingEmailUser
      : existingSeedUser
        ? await prisma.user.update({
            where: { id: existingSeedUser.id },
            data: {
              email: DEVELOPMENT_USER_EMAIL,
              firstName: "Ethan",
              lastName: "Boyd",
              profileImageUrl: null,
            },
          })
        : await prisma.user.create({
            data: {
              authProviderId: DEVELOPMENT_USER_AUTH_PROVIDER_ID,
              email: DEVELOPMENT_USER_EMAIL,
              firstName: "Ethan",
              lastName: "Boyd",
            },
          });

    const existingWedding = await prisma.wedding.findFirst({
      where: {
        name: DEVELOPMENT_WEDDING_NAME,
        partnerOneName: DEVELOPMENT_PARTNER_ONE_NAME,
        partnerTwoName: DEVELOPMENT_PARTNER_TWO_NAME,
        weddingDate: developmentWeddingDate,
      },
    });

    const wedding = existingWedding
      ? await prisma.wedding.update({
          where: { id: existingWedding.id },
          data: {
            ceremonyLocation: DEVELOPMENT_CEREMONY_LOCATION,
            receptionLocation: DEVELOPMENT_RECEPTION_LOCATION,
            timezone: DEVELOPMENT_TIMEZONE,
            currencyCode: DEVELOPMENT_CURRENCY_CODE,
            mealChoicesEnabled: true,
            dietaryRequirementsEnabled: true,
          },
        })
      : await prisma.wedding.create({
          data: {
            name: DEVELOPMENT_WEDDING_NAME,
            partnerOneName: DEVELOPMENT_PARTNER_ONE_NAME,
            partnerTwoName: DEVELOPMENT_PARTNER_TWO_NAME,
            weddingDate: developmentWeddingDate,
            ceremonyLocation: DEVELOPMENT_CEREMONY_LOCATION,
            receptionLocation: DEVELOPMENT_RECEPTION_LOCATION,
            timezone: DEVELOPMENT_TIMEZONE,
            currencyCode: DEVELOPMENT_CURRENCY_CODE,
            mealChoicesEnabled: true,
            dietaryRequirementsEnabled: true,
          },
        });

    await prisma.weddingMember.upsert({
      where: {
        weddingId_userId: {
          weddingId: wedding.id,
          userId: user.id,
        },
      },
      update: {
        role: "OWNER",
        status: "ACTIVE",
        joinedAt: developmentMembershipJoinedAt,
        leftAt: null,
      },
      create: {
        weddingId: wedding.id,
        userId: user.id,
        role: "OWNER",
        status: "ACTIVE",
        joinedAt: developmentMembershipJoinedAt,
      },
    });

    const categories = new Map<string, { id: string }>();

    for (const definition of categoryDefinitions) {
      const category = await prisma.taskCategory.upsert({
        where: {
          weddingId_name: {
            weddingId: wedding.id,
            name: definition.name,
          },
        },
        update: { position: definition.position },
        create: {
          weddingId: wedding.id,
          name: definition.name,
          position: definition.position,
        },
        select: { id: true },
      });

      categories.set(definition.name, category);
    }

    for (const definition of taskDefinitions) {
      const category = categories.get(definition.categoryName);

      if (!category) {
        throw new Error(`Missing seed category: ${definition.categoryName}`);
      }

      const taskData = {
        weddingId: wedding.id,
        categoryId: category.id,
        title: definition.title,
        description: definition.description,
        status: definition.status,
        priority: definition.priority,
        dueDate: dateOnly(definition.dueDate),
        completedAt:
          definition.status === TaskStatus.COMPLETED
            ? dateOnly(definition.dueDate)
            : null,
        position: definition.position,
      };

      const existingTask = await prisma.task.findFirst({
        where: {
          weddingId: wedding.id,
          categoryId: category.id,
          title: definition.title,
        },
        select: { id: true },
      });

      if (existingTask) {
        await prisma.task.update({ where: { id: existingTask.id }, data: taskData });
      } else {
        await prisma.task.create({ data: taskData });
      }
    }

    const households = new Map<string, { id: string }>();

    for (const definition of householdDefinitions) {
      const existingHousehold = await prisma.household.findFirst({
        where: { weddingId: wedding.id, name: definition.name },
        select: { id: true },
      });

      const household = existingHousehold
        ? await prisma.household.update({
            where: { id: existingHousehold.id },
            data: {
              addressLineOne: definition.addressLineOne,
              addressLineTwo: definition.addressLineTwo,
              townCity: definition.townCity,
              countyRegion: definition.countyRegion,
              postcode: definition.postcode,
              country: definition.country,
              notes: definition.notes,
            },
            select: { id: true },
          })
        : await prisma.household.create({
            data: { weddingId: wedding.id, ...definition },
            select: { id: true },
          });

      households.set(definition.name, household);
    }

    const tags = new Map<string, { id: string }>();

    for (const definition of guestTagDefinitions) {
      const tag = await prisma.guestTag.upsert({
        where: {
          weddingId_name: {
            weddingId: wedding.id,
            name: definition.name,
          },
        },
        update: { colour: definition.colour },
        create: {
          weddingId: wedding.id,
          name: definition.name,
          colour: definition.colour,
        },
        select: { id: true },
      });

      tags.set(definition.name, tag);
    }

    const existingSectionCount = await prisma.weddingSection.count({
      where: { weddingId: wedding.id },
    });

    // Seed only an empty wedding. Once a wedding has any section data, it is
    // user-owned and must not be renamed, reordered, reactivated, or removed
    // by a later development seed run.
    if (existingSectionCount === 0) {
      await prisma.weddingSection.createMany({
        data: weddingSectionDefinitions.map((definition) => ({
          weddingId: wedding.id,
          name: definition.name,
          description: definition.description,
          position: definition.position,
          active: true,
        })),
      });
    }

    const guests = new Map<string, { id: string }>();

    for (const definition of guestDefinitions) {
      const householdId = definition.householdName
        ? households.get(definition.householdName)?.id ?? null
        : null;

      if (definition.householdName && !householdId) {
        throw new Error(`Missing seed household: ${definition.householdName}`);
      }

      const guestData = {
        weddingId: wedding.id,
        householdId,
        plusOneForGuestId: null,
        title: definition.title,
        firstName: definition.firstName,
        lastName: definition.lastName,
        email: definition.email,
        phone: definition.phone,
        ageGroup: definition.ageGroup,
        dietaryRequirements: definition.dietaryRequirements,
        notes: definition.notes,
      };

      const existingGuest = await prisma.guest.findFirst({
        where: {
          weddingId: wedding.id,
          firstName: definition.firstName,
          lastName: definition.lastName,
        },
        select: { id: true },
      });

      const guest = existingGuest
        ? await prisma.guest.update({
            where: { id: existingGuest.id },
            data: guestData,
            select: { id: true },
          })
        : await prisma.guest.create({
            data: guestData,
            select: { id: true },
          });

      guests.set(definition.key, guest);

      for (const tagName of definition.tags) {
        const tag = tags.get(tagName);
        if (!tag) throw new Error(`Missing seed guest tag: ${tagName}`);

        await prisma.guestTagAssignment.upsert({
          where: { guestId_tagId: { guestId: guest.id, tagId: tag.id } },
          update: {},
          create: { guestId: guest.id, tagId: tag.id },
        });
      }
    }

    for (const definition of guestDefinitions) {
      if (!("plusOneForKey" in definition)) continue;

      const guest = guests.get(definition.key);
      const plusOneFor = guests.get(definition.plusOneForKey);

      if (!guest || !plusOneFor) {
        throw new Error(`Missing seed plus-one relationship for ${definition.key}`);
      }

      await prisma.guest.update({
        where: { id: guest.id },
        data: { plusOneForGuestId: plusOneFor.id },
      });
    }

    for (const householdDefinition of householdDefinitions) {
      const primaryDefinition = guestDefinitions.find(
        (guest) => guest.householdName === householdDefinition.name,
      );
      const household = households.get(householdDefinition.name);
      const primaryGuest = primaryDefinition
        ? guests.get(primaryDefinition.key)
        : null;

      if (household && primaryGuest) {
        await prisma.household.update({
          where: { id: household.id },
          data: { primaryGuestId: primaryGuest.id },
        });
      }
    }

  console.log("Development seed completed.");
}

main()
  .catch((error) => {
    console.error("Development seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
