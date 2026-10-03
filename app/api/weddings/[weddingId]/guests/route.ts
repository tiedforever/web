import { WeddingMemberRole } from "@/app/generated/prisma/client";
import { ActiveWeddingRequiredError } from "@/src/server/auth/get-active-wedding";
import { AuthenticationRequiredError } from "@/src/server/auth/get-authenticated-user";
import { PermissionDeniedError, requireRole } from "@/src/server/auth/authorization";
import { getGuestsPageData } from "@/src/server/actions/guests/guest-page.actions";
import { logger } from "@/src/server/logging/logger";

export const dynamic = "force-dynamic";

const responseHeaders = { "Cache-Control": "private, no-store" };

function firstParam(value: string | null) {
  return value === null ? undefined : value;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ weddingId: string }> },
) {
  const { weddingId } = await params;

  try {
    const context = await requireRole(
      [
        WeddingMemberRole.OWNER,
        WeddingMemberRole.EDITOR,
        WeddingMemberRole.VIEWER,
      ],
      { redirectToOnboarding: false },
    );

    if (context.wedding.id !== weddingId) {
      return Response.json(
        { error: "Guest list not found." },
        { status: 404, headers: responseHeaders },
      );
    }

    const url = new URL(request.url);
    const result = await getGuestsPageData({
      search: firstParam(url.searchParams.get("search")),
      ageGroup: firstParam(url.searchParams.get("ageGroup")),
      tagId: firstParam(url.searchParams.get("tagId")),
      sectionId: firstParam(url.searchParams.get("sectionId")),
    }, weddingId);

    if (!result.success) {
      return Response.json(
        { error: result.error },
        {
          status: result.error === "Guest list not found." ? 404 : 500,
          headers: responseHeaders,
        },
      );
    }

    return Response.json(result.data, { headers: responseHeaders });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json(
        { error: "Authentication is required." },
        { status: 401, headers: responseHeaders },
      );
    }
    if (error instanceof ActiveWeddingRequiredError) {
      return Response.json(
        { error: "An active wedding is required." },
        { status: 404, headers: responseHeaders },
      );
    }
    if (error instanceof PermissionDeniedError) {
      return Response.json(
        { error: error.message },
        { status: 403, headers: responseHeaders },
      );
    }

    logger.error("[guests-route] read failed", error);
    return Response.json(
      { error: "Unable to load guest data." },
      { status: 500, headers: responseHeaders },
    );
  }
}
