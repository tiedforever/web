import type { MetadataRoute } from "next";

import {
  PRODUCTION_ORIGIN,
  isProductionIndexable,
} from "@/src/seo/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isProductionIndexable()) {
    return [];
  }

  return [
    {
      url: `${PRODUCTION_ORIGIN}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
