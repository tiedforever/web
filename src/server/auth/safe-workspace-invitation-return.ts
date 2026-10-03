import "server-only";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

type WorkspaceInvitationAuthRoute = "/sign-in" | "/sign-up";

export function getSafeWorkspaceInvitationReturnPath(value: unknown) {
  if (typeof value !== "string" || value.length > 500) return null;

  try {
    const url = new URL(value, "https://tied-forever.invalid");
    const token = url.searchParams.get("token");

    if (
      url.origin !== "https://tied-forever.invalid" ||
      url.pathname !== "/invitations/accept" ||
      !token ||
      !TOKEN_PATTERN.test(token)
    ) {
      return null;
    }

    return `/invitations/accept?token=${encodeURIComponent(token)}`;
  } catch {
    return null;
  }
}

/**
 * Build a Clerk auth URL for a workspace invitation without accepting an
 * arbitrary redirect destination. The invitation return path is validated
 * again here because this helper is also used when signing out an existing
 * session.
 */
export function getWorkspaceInvitationAuthPath(
  route: WorkspaceInvitationAuthRoute,
  returnPath: string,
  email?: string | null,
) {
  const safeReturnPath = getSafeWorkspaceInvitationReturnPath(returnPath);
  if (!safeReturnPath) return null;

  const query = new URLSearchParams({ redirect_url: safeReturnPath });
  const safeEmail = email ? getSafeWorkspaceInvitationEmail(email) : undefined;

  if (safeEmail) {
    query.set("email", safeEmail);
  }

  return `${route}?${query.toString()}`;
}

export function getSafeWorkspaceInvitationEmail(value: unknown) {
  if (typeof value !== "string" || value.length > 254) return undefined;

  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}
