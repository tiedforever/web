import type { ReactNode } from "react";

import { getWeddingPageContext } from "@/src/server/auth/get-wedding-page-context";

import { WeddingRequiredState } from "./wedding-required-state";

export async function WeddingRequiredPage({
  children,
  feature,
}: {
  children: ReactNode;
  feature?: string;
}) {
  const context = await getWeddingPageContext();

  if (!context) {
    return <WeddingRequiredState feature={feature} />;
  }

  return children;
}
