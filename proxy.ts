import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

const protectedRoutes = [
  "/onboarding",
  "/weddings",
  "/dashboard",
  "/checklist",
  "/guests",
  "/invitations",
  "/rsvps",
  "/seating",
  "/suppliers",
  "/budget",
  "/timeline",
  "/registry",
  "/documents",
  "/notes",
  "/settings",
] as const;

function isProtectedPath(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Workspace invitation acceptance is public; the token and verified Clerk email are
  // validated by the acceptance service before any membership is created.
  if (pathname === "/invitations/accept") return false;

  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedPath(request)) {
    const isDocumentRequest = request.method === "GET" && (
      request.headers.get("sec-fetch-dest") === "document" ||
      request.headers.get("accept")?.includes("text/html")
    );
    await auth.protect(isDocumentRequest
      ? { unauthenticatedUrl: new URL("/", request.url).toString() }
      : undefined);
  }
}, { signInUrl: "/sign-in", signUpUrl: "/sign-up" });

export const config = {
  matcher: [
    // Run Clerk on application requests while leaving static assets alone.
    "/((?!_next|sitemap\\.xml|robots\\.txt|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
