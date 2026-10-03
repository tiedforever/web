type SignOut = (options: { redirectUrl: string }) => Promise<void>;

export const ACCOUNT_DELETION_ROUTE = "/goodbye";

/**
 * The hard navigation is intentionally independent of Clerk sign-out. The
 * backend has already deleted the Clerk user, so the browser must leave the
 * protected route even if Clerk can no longer resolve the old session.
 */
export function navigateAfterAccountDeletion(
  signOut: SignOut,
  hardNavigate: (path: string) => void,
) {
  try {
    void signOut({ redirectUrl: ACCOUNT_DELETION_ROUTE }).catch(() => undefined);
  } catch {
    // The user has already been deleted. The hard navigation below remains
    // authoritative if Clerk rejects the stale-session sign-out call.
  }

  hardNavigate(ACCOUNT_DELETION_ROUTE);
}
