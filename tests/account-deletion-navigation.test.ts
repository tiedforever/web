import { describe, expect, it, vi } from "vitest";

import {
  ACCOUNT_DELETION_ROUTE,
  navigateAfterAccountDeletion,
} from "../src/components/settings/account-deletion-navigation";

describe("navigateAfterAccountDeletion", () => {
  it("hard-navigates to the public post-deletion route without awaiting Clerk", async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    const hardNavigate = vi.fn();

    await navigateAfterAccountDeletion(signOut, hardNavigate);

    expect(signOut).toHaveBeenCalledWith({ redirectUrl: ACCOUNT_DELETION_ROUTE });
    expect(signOut).not.toHaveBeenCalledWith({ redirectUrl: "/settings/account" });
    expect(hardNavigate).toHaveBeenCalledWith(ACCOUNT_DELETION_ROUTE);
  });

  it("hard-navigates even when the deleted session cannot sign out", async () => {
    const signOut = vi.fn().mockRejectedValue(new Error("session deleted"));
    const hardNavigate = vi.fn();

    await navigateAfterAccountDeletion(signOut, hardNavigate);

    expect(hardNavigate).toHaveBeenCalledWith(ACCOUNT_DELETION_ROUTE);
  });
});
