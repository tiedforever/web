import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ middlewareOptions: {} as Record<string, unknown>, protect: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: (handler: unknown, options: Record<string, unknown>) => {
    mocks.middlewareOptions = options;
    return handler;
  },
}));

import proxy from "../proxy";
const runProxy = proxy as unknown as (auth: { protect: typeof mocks.protect }, request: NextRequest) => Promise<void>;

describe("authentication proxy", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["http://localhost:3000", "https://qa.tied-forever.com", "https://tied-forever.com"])("sends signed-out page visits to the homepage on %s", async (origin) => {
    await runProxy({ protect: mocks.protect }, new NextRequest(`${origin}/dashboard`, { headers: { accept: "text/html" } }));
    expect(mocks.protect).toHaveBeenCalledWith({ unauthenticatedUrl: `${origin}/` });
  });

  it("keeps automatic sign-in and sign-up within Tied Forever", () => {
    expect(mocks.middlewareOptions).toEqual({ signInUrl: "/sign-in", signUpUrl: "/sign-up" });
  });

  it.each(["/", "/sign-in", "/sign-up", "/invitations/accept?token=test"])("keeps %s publicly accessible", async (path) => {
    await runProxy({ protect: mocks.protect }, new NextRequest(`http://localhost:3000${path}`, { headers: { accept: "text/html" } }));
    expect(mocks.protect).not.toHaveBeenCalled();
  });

  it("retains authentication protection for data requests", async () => {
    await runProxy({ protect: mocks.protect }, new NextRequest("http://localhost:3000/dashboard", { headers: { accept: "application/json" } }));
    expect(mocks.protect).toHaveBeenCalledWith(undefined);
  });

  it("protects the additional wedding creation page", async () => {
    await runProxy({ protect: mocks.protect }, new NextRequest("http://localhost:3000/weddings/new", { headers: { accept: "text/html" } }));
    expect(mocks.protect).toHaveBeenCalledWith({ unauthenticatedUrl: "http://localhost:3000/" });
  });

  it("retains authentication protection for server actions", async () => {
    await runProxy({ protect: mocks.protect }, new NextRequest("http://localhost:3000/settings/members", { method: "POST", headers: { accept: "text/html" } }));
    expect(mocks.protect).toHaveBeenCalledWith(undefined);
  });
});
