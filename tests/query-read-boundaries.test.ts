import { describe, expect, it, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class AuthenticationRequiredError extends Error {}
  class ActiveWeddingRequiredError extends Error {}
  class PermissionDeniedError extends Error {}

  return {
    requireRole: vi.fn(),
    getChecklistData: vi.fn(),
    getDashboardData: vi.fn(),
    getGuestsPageData: vi.fn(),
    logger: { error: vi.fn() },
    AuthenticationRequiredError,
    ActiveWeddingRequiredError,
    PermissionDeniedError,
  };
});

vi.mock("@/src/server/auth/authorization", () => ({
  PermissionDeniedError: mocks.PermissionDeniedError,
  requireRole: mocks.requireRole,
}));
vi.mock("@/src/server/auth/get-active-wedding", () => ({
  ActiveWeddingRequiredError: mocks.ActiveWeddingRequiredError,
}));
vi.mock("@/src/server/auth/get-authenticated-user", () => ({
  AuthenticationRequiredError: mocks.AuthenticationRequiredError,
}));
vi.mock("@/src/server/actions/checklist/checklist.actions", () => ({
  getChecklistData: mocks.getChecklistData,
}));
vi.mock("@/src/server/actions/dashboard/dashboard.actions", () => ({
  getDashboardData: mocks.getDashboardData,
}));
vi.mock("@/src/server/actions/guests/guest-page.actions", () => ({
  getGuestsPageData: mocks.getGuestsPageData,
}));
vi.mock("@/src/server/logging/logger", () => ({ logger: mocks.logger }));

import { GET as getChecklist } from "../app/api/weddings/[weddingId]/checklist/route";
import { GET as getDashboard } from "../app/api/weddings/[weddingId]/dashboard/route";
import { GET as getGuests } from "../app/api/weddings/[weddingId]/guests/route";

const checklistData = { categories: [], members: [] };
const dashboardData = {
  guestCount: 1,
  unassignedGuestCount: 0,
  householdCount: 1,
  taskCount: 0,
  completedTaskCount: 0,
  upcomingTasks: [],
};
const guestsData = {
  guestList: { standaloneGuests: [], households: [], tags: [] },
  sections: [],
};

describe("client read boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ wedding: { id: "wedding_1" } });
    mocks.getChecklistData.mockResolvedValue({ success: true, data: checklistData });
    mocks.getDashboardData.mockResolvedValue({ success: true, data: dashboardData });
    mocks.getGuestsPageData.mockResolvedValue({ success: true, data: guestsData });
  });

  it("requires the server-side authorization boundary before returning Checklist data", async () => {
    const response = await getChecklist(new Request("http://localhost"), {
      params: Promise.resolve({ weddingId: "wedding_1" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(checklistData);
    expect(mocks.requireRole).toHaveBeenCalledOnce();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("rejects a forged Checklist wedding id", async () => {
    const response = await getChecklist(new Request("http://localhost"), {
      params: Promise.resolve({ weddingId: "wedding_2" }),
    });

    expect(response.status).toBe(404);
    expect(mocks.getChecklistData).not.toHaveBeenCalled();
  });

  it("requires the server-side authorization boundary before returning Dashboard data", async () => {
    const response = await getDashboard(new Request("http://localhost"), {
      params: Promise.resolve({ weddingId: "wedding_1" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(dashboardData);
    expect(mocks.requireRole).toHaveBeenCalledOnce();
  });

  it("rejects a forged Dashboard wedding id", async () => {
    const response = await getDashboard(new Request("http://localhost"), {
      params: Promise.resolve({ weddingId: "wedding_2" }),
    });

    expect(response.status).toBe(404);
    expect(mocks.getDashboardData).not.toHaveBeenCalled();
  });

  it("passes normalized URL filters through the authorized Guests boundary", async () => {
    const response = await getGuests(
      new Request("http://localhost?search=Ada&ageGroup=ADULT&tagId=tag_1&sectionId=section_1"),
      { params: Promise.resolve({ weddingId: "wedding_1" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(guestsData);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.getGuestsPageData).toHaveBeenCalledWith(
      {
        search: "Ada",
        ageGroup: "ADULT",
        tagId: "tag_1",
        sectionId: "section_1",
      },
      "wedding_1",
    );
  });

  it("rejects a forged Guests wedding id", async () => {
    const response = await getGuests(new Request("http://localhost"), {
      params: Promise.resolve({ weddingId: "wedding_2" }),
    });

    expect(response.status).toBe(404);
    expect(mocks.getGuestsPageData).not.toHaveBeenCalled();
  });

  it("returns an authentication error instead of data when Clerk auth fails", async () => {
    mocks.requireRole.mockRejectedValue(new mocks.AuthenticationRequiredError());

    const response = await getDashboard(new Request("http://localhost"), {
      params: Promise.resolve({ weddingId: "wedding_1" }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication is required." });
  });
});
