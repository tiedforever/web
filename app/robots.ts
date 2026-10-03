import type { MetadataRoute } from "next";

import {
  PRODUCTION_ORIGIN,
  isProductionIndexable,
} from "@/src/seo/site-metadata";

const privatePaths = [
  "/api/",
  "/dashboard",
  "/checklist",
  "/guests",
  "/settings",
  "/onboarding",
  "/budget",
  "/documents",
  "/invitations",
  "/notes",
  "/registry",
  "/rsvps",
  "/seating",
  "/suppliers",
  "/timeline",
];

export default function robots(): MetadataRoute.Robots {
  if (!isProductionIndexable()) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/invitations/accept"],
      disallow: privatePaths,
    },
    sitemap: `${PRODUCTION_ORIGIN}/sitemap.xml`,
  };
}
