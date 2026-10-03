import "server-only";

import { redirect } from "next/navigation";

import {
  AuthenticationRequiredError,
} from "./get-authenticated-user";
import {
  getActiveWedding,
  type ActiveWeddingContext,
} from "./get-active-wedding";

/**
 * Page-level wedding context is optional. Mutations and sensitive reads keep
 * using requireWedding/requireActionWedding so authorization is unchanged.
 */
export async function getWeddingPageContext(): Promise<ActiveWeddingContext | null> {
  try {
    return await getActiveWedding({ redirectToOnboarding: false });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect("/sign-in");
    }

    throw error;
  }
}
