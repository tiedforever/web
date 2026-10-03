import type { Metadata } from "next";

export const PRODUCTION_ORIGIN = "https://tied-forever.com";
export const SITE_DESCRIPTION = "Plan every detail of your wedding with Tied Forever.";

export const NO_INDEX_ROBOTS = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
} satisfies NonNullable<Metadata["robots"]>;

/**
 * Indexing is enabled only for the canonical production deployment. Preview
 * deployments and local builds must remain out of search results by default.
 */
export function isProductionIndexable() {
  const configuredAppUrl = process.env.APP_URL?.trim().replace(/\/+$/, "");
  const hasNonProductionVercelEnvironment =
    Boolean(process.env.VERCEL_ENV) && process.env.VERCEL_ENV !== "production";

  return (
    process.env.NODE_ENV === "production" &&
    configuredAppUrl === PRODUCTION_ORIGIN &&
    !hasNonProductionVercelEnvironment
  );
}
