import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("../src/server/actions/checklist/checklist.actions", () => ({
  completeTask: vi.fn(),
  createCategory: vi.fn(),
  createTask: vi.fn(),
  deleteCategory: vi.fn(),
  deleteTask: vi.fn(),
  reopenTask: vi.fn(),
  updateCategory: vi.fn(),
  updateTask: vi.fn(),
}));
vi.mock("../src/server/actions/guests/guest.actions", () => ({
  createGuest: vi.fn(),
  removePlusOneRelationship: vi.fn(),
}));
vi.mock("../src/server/actions/guests/guest-tag.actions", () => ({
  createGuestTag: vi.fn(),
}));
vi.mock("../src/server/repositories/guest-list.repository", () => ({
  parseGuestListFilters: vi.fn(() => ({ value: {} })),
}));

import DashboardPage from "../app/dashboard/page";
import ChecklistPage from "../app/checklist/page";
import GuestsPage from "../app/guests/page";
import {
  ChecklistWorkspaceView,
  DashboardWorkspaceView,
  GuestsWorkspaceView,
} from "../src/components/workspace/workspace-destinations";
import { WorkspaceProvider } from "../src/components/shared/workspace-context";
import { weddingQueryKeys } from "../src/query-keys";
import type { DashboardQueryData } from "../src/types/dashboard";
import type { GuestQueryFilters, GuestsReadData } from "../src/types/guests";
import type { ChecklistReadData } from "../src/server/actions/checklist/checklist.actions";

const workspace = {
  onboardingSkipped: true,
  role: "VIEWER" as const,
  wedding: {
    id: "wedding_1",
    weddingName: "Ada & Charles",
    partnerNames: "Ada & Charles",
    weddingDate: "1 June 2030",
    weddingDateIso: "2030-06-01T00:00:00.000Z",
    timezone: "Europe/London",
    locationSummary: null,
    countdown: "1,000 days to go",
  },
  availableWeddings: [],
  user: {
    firstName: "Ada",
    userName: "Ada Lovelace",
    userEmail: "ada@example.com",
    userInitials: "AL",
    profileImageUrl: null,
  },
};

const dashboardData: DashboardQueryData = {
  guestCount: 4,
  unassignedGuestCount: 1,
  householdCount: 2,
  taskCount: 3,
  completedTaskCount: 1,
  upcomingTasks: [],
};

const checklistData: ChecklistReadData = { categories: [], members: [] };
const guestsData: GuestsReadData = {
  guestList: { standaloneGuests: [], households: [], tags: [] },
  sections: [],
};
const emptyFilters: GuestQueryFilters = {
  search: "",
  ageGroup: "",
  tagId: "",
  sectionId: "",
};

function renderWithWorkspace(element: React.ReactNode, client = new QueryClient()) {
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <WorkspaceProvider value={workspace}>{element}</WorkspaceProvider>
    </QueryClientProvider>,
  );
}

describe("persistent workspace destinations", () => {
  it("keeps the three destination pages free of page-level workspace reads", async () => {
    const dashboard = await DashboardPage();
    const checklist = await ChecklistPage();
    const guests = await GuestsPage({ searchParams: Promise.resolve({}) });

    expect(dashboard.type).toBe(DashboardWorkspaceView);
    expect(checklist.type).toBe(ChecklistWorkspaceView);
    expect(guests.type).toBe(GuestsWorkspaceView);
  });

  it("provides active wedding display scope to cached destination views", () => {
    const client = new QueryClient();
    client.setQueryData(weddingQueryKeys.dashboard("wedding_1"), dashboardData);
    client.setQueryData(weddingQueryKeys.checklist("wedding_1"), checklistData);
    client.setQueryData(weddingQueryKeys.guests("wedding_1", emptyFilters), guestsData);

    expect(renderWithWorkspace(<DashboardWorkspaceView />, client)).toContain("Good morning, Ada");
    expect(renderWithWorkspace(<ChecklistWorkspaceView />, client)).toContain("Wedding Checklist");
    expect(renderWithWorkspace(<GuestsWorkspaceView filters={emptyFilters} />, client)).toContain("Guest list");
  });

  it("keeps the skipped no-wedding state instead of redirecting to onboarding", () => {
    const noWeddingWorkspace = { ...workspace, wedding: null };

    const markup = renderToStaticMarkup(
      <WorkspaceProvider value={noWeddingWorkspace}>
        <ChecklistWorkspaceView />
      </WorkspaceProvider>,
    );

    expect(markup).toContain("Create your wedding to get started");
  });
});
