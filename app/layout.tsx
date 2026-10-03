import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

import { AuthBoundary } from "@/src/components/auth/auth-boundary";
import type { AccountAccessError } from "@/src/components/auth/account-access-state";
import { QueryProvider } from "@/src/components/providers/query-provider";
import { type AppShellContext } from "@/src/components/shared/app-shell";
import { getOnboardingState } from "@/src/server/auth/get-onboarding-state";
import {
  AuthenticationRequiredError,
  getAuthenticatedUser,
  getAccountAccessErrorCopy,
} from "@/src/server/auth/get-authenticated-user";
import { getActiveWedding } from "@/src/server/auth/get-active-wedding";
import { logger } from "@/src/server/logging/logger";
import {
  NO_INDEX_ROBOTS,
  PRODUCTION_ORIGIN,
  SITE_DESCRIPTION,
  isProductionIndexable,
} from "@/src/seo/site-metadata";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "Tied Forever",
  metadataBase: new URL(PRODUCTION_ORIGIN),
  title: {
    default: "Tied Forever",
    template: "%s | Tied Forever",
  },
  description: SITE_DESCRIPTION,
  robots: isProductionIndexable()
    ? { index: true, follow: true }
    : NO_INDEX_ROBOTS,
  openGraph: {
    title: "Tied Forever Wedding Planner",
    description: SITE_DESCRIPTION,
    url: PRODUCTION_ORIGIN,
    siteName: "Tied Forever",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

function formatWeddingDate(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeZone: timezone,
  }).format(date);
}

function formatCountdown(date: Date) {
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);

  if (days > 0) return `${days} days to go`;
  if (days === 0) return "Wedding day";
  return "Wedding date passed";
}

async function getShellContext(): Promise<AppShellContext | null> {
  let activeWeddingContext: Awaited<ReturnType<typeof getActiveWedding>> = null;

  try {
    activeWeddingContext = await getActiveWedding({
      redirectToOnboarding: false,
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return null;
    }

    logger.error("[layout] active wedding context load failed", error);
    throw error;
  }

  let authenticatedUser: Awaited<ReturnType<typeof getAuthenticatedUser>> | null =
    null;

  if (!activeWeddingContext) {
    try {
      authenticatedUser = await getAuthenticatedUser();
    } catch (error) {
      if (!(error instanceof AuthenticationRequiredError)) {
        logger.error("[layout] authenticated user load failed", error);
        throw error;
      }

      return null;
    }
  }

  let wedding: AppShellContext["wedding"] = null;
  let onboardingSkipped = true;

  if (activeWeddingContext) {
    const { ceremonyLocation, receptionLocation } = activeWeddingContext.wedding;
    wedding = {
      id: activeWeddingContext.wedding.id,
      weddingName: activeWeddingContext.wedding.name,
      partnerNames: `${activeWeddingContext.wedding.partnerOneName} & ${activeWeddingContext.wedding.partnerTwoName}`,
      weddingDate: formatWeddingDate(
        activeWeddingContext.wedding.weddingDate,
        activeWeddingContext.wedding.timezone,
      ),
      weddingDateIso: activeWeddingContext.wedding.weddingDate.toISOString(),
      timezone: activeWeddingContext.wedding.timezone,
      locationSummary: [ceremonyLocation, receptionLocation]
        .filter((location): location is string => Boolean(location))
        .join(" · ") || null,
      countdown: formatCountdown(activeWeddingContext.wedding.weddingDate),
    };
  } else if (authenticatedUser) {
    try {
      ({ skipped: onboardingSkipped } = await getOnboardingState());
    } catch (error) {
      logger.error("[layout] onboarding state load failed", error);
      onboardingSkipped = false;
    }
  }

  const user = activeWeddingContext?.user ?? authenticatedUser?.user;

  if (!user) {
    return null;
  }

  const fallbackName = user.email;

  return {
    onboardingSkipped,
    role: activeWeddingContext?.role ?? null,
    wedding,
    availableWeddings: activeWeddingContext?.availableWeddings.map((availableWedding) => ({
      id: availableWedding.id,
      name: availableWedding.name,
      partnerNames: `${availableWedding.partnerOneName} & ${availableWedding.partnerTwoName}`,
    })) ?? [],
    user: {
      firstName: user.firstName,
      userName:
        [user.firstName, user.lastName].filter(Boolean).join(" ") || fallbackName,
      userEmail: user.email,
      userInitials:
        `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() || "TF",
      profileImageUrl: user.profileImageUrl,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let context: AppShellContext | null = null;
  let accountError: AccountAccessError | undefined;
  try {
    context = await getShellContext();
  } catch (error) {
    accountError = getAccountAccessErrorCopy(error);
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
          <QueryProvider>
            <AuthBoundary accountError={accountError} context={context}>{children}</AuthBoundary>
          </QueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
