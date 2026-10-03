import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/guests",
  useRouter: () => ({ push: vi.fn() }),
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

import { ChecklistQueryView } from "../src/components/checklist/checklist-query-view";
import { DashboardQueryView } from "../src/components/dashboard/dashboard-query-view";
import { GuestsQueryView } from "../src/components/guests/guests-query-view";
import { weddingQueryKeys } from "../src/query-keys";
import type { ChecklistReadData } from "../src/server/actions/checklist/checklist.actions";
import type { DashboardQueryData } from "../src/types/dashboard";
import type { GuestsReadData } from "../src/types/guests";

const checklistData: ChecklistReadData = {
  categories: [],
  members: [],
};

const dashboardData: DashboardQueryData = {
  guestCount: 12,
  unassignedGuestCount: 3,
  householdCount: 5,
  taskCount: 8,
  completedTaskCount: 4,
  upcomingTasks: [],
};

const guestsData: GuestsReadData = {
  guestList: {
    standaloneGuests: [],
    households: [],
    tags: [],
  },
  sections: [],
};

function clientWith<T>(key: readonly unknown[], data: T) {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: false } },
  });
  client.setQueryData(key, data);
  return client;
}

describe("client-first cached query views", () => {
  it("renders cached Dashboard data without waiting for a fresh fetch", () => {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={clientWith(weddingQueryKeys.dashboard("wedding_1"), dashboardData)}>
        <DashboardQueryView
          presentation={{
            userFirstName: "Ada",
            weddingName: "Ada & Charles",
            partnerNames: "Ada & Charles",
            weddingDate: "2030-06-01T00:00:00.000Z",
            timezone: "Europe/London",
            locationSummary: null,
          }}
          weddingId="wedding_1"
        />
      </QueryClientProvider>,
    );

    expect(markup).toContain("12");
    expect(markup).toContain("Good morning, Ada");
  });

  it("renders cached Checklist data without waiting for a fresh fetch", () => {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={clientWith(weddingQueryKeys.checklist("wedding_1"), checklistData)}>
        <ChecklistQueryView
          canEdit={false}
          weddingDate="2030-06-01T00:00:00.000Z"
          weddingId="wedding_1"
          weddingName="Ada & Charles"
          timezone="Europe/London"
        />
      </QueryClientProvider>,
    );

    expect(markup).toContain("Wedding Checklist");
    expect(markup).not.toContain("Loading checklist");
  });

  it("renders cached Guests data without waiting for a fresh fetch", () => {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={clientWith(weddingQueryKeys.guests("wedding_1", {
        search: "",
        ageGroup: "",
        tagId: "",
        sectionId: "",
      }), guestsData)}>
        <GuestsQueryView
          canEdit={false}
          filters={{ search: "", ageGroup: "", tagId: "", sectionId: "" }}
          partnerNames="Ada & Charles"
          weddingId="wedding_1"
        />
      </QueryClientProvider>,
    );

    expect(markup).toContain("Guest list");
    expect(markup).not.toContain("Loading…");
  });

  it("renders a page-specific skeleton for each cold query", () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => new Promise<Response>(() => {}));

    try {
      const dashboardMarkup = renderToStaticMarkup(
        <QueryClientProvider client={new QueryClient()}>
          <DashboardQueryView
            presentation={{
              userFirstName: "Ada",
              weddingName: "Ada & Charles",
              partnerNames: "Ada & Charles",
              weddingDate: "2030-06-01T00:00:00.000Z",
              timezone: "Europe/London",
              locationSummary: null,
            }}
            weddingId="wedding_1"
          />
        </QueryClientProvider>,
      );
      const checklistMarkup = renderToStaticMarkup(
        <QueryClientProvider client={new QueryClient()}>
          <ChecklistQueryView
            canEdit={false}
            weddingDate="2030-06-01T00:00:00.000Z"
            weddingId="wedding_1"
            weddingName="Ada & Charles"
            timezone="Europe/London"
          />
        </QueryClientProvider>,
      );
      const guestsMarkup = renderToStaticMarkup(
        <QueryClientProvider client={new QueryClient()}>
          <GuestsQueryView
            canEdit={false}
            filters={{ search: "", ageGroup: "", tagId: "", sectionId: "" }}
            partnerNames="Ada & Charles"
            weddingId="wedding_1"
          />
        </QueryClientProvider>,
      );

      expect(dashboardMarkup).toContain("Loading your dashboard…");
      expect(checklistMarkup).toContain("Loading your checklist…");
      expect(guestsMarkup).toContain("Loading your guest list…");
      expect(dashboardMarkup).toContain('role="status"');
      expect(checklistMarkup).toContain('role="status"');
      expect(guestsMarkup).toContain('role="status"');
      expect(dashboardMarkup).toContain("animate-pulse");
      expect(checklistMarkup).toContain("animate-pulse");
      expect(guestsMarkup).toContain("animate-pulse");
    } finally {
      fetchMock.mockRestore();
    }
  });

  it("does not show a skeleton for stale cached data", () => {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: 0, retry: false } },
    });
    client.setQueryData(weddingQueryKeys.dashboard("wedding_1"), dashboardData);

    const markup = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <DashboardQueryView
          presentation={{
            userFirstName: "Ada",
            weddingName: "Ada & Charles",
            partnerNames: "Ada & Charles",
            weddingDate: "2030-06-01T00:00:00.000Z",
            timezone: "Europe/London",
            locationSummary: null,
          }}
          weddingId="wedding_1"
        />
      </QueryClientProvider>,
    );

    expect(markup).toContain("Good morning, Ada");
    expect(markup).not.toContain("Loading your dashboard…");
  });

  it("keeps cached content visible when a background refresh is in error", () => {
    const key = weddingQueryKeys.guests("wedding_1", {
      search: "",
      ageGroup: "",
      tagId: "",
      sectionId: "",
    });
    const client = clientWith(key, guestsData);
    const query = client.getQueryCache().find({ queryKey: key });
    query?.setState({
      error: new Error("refresh failed"),
      fetchStatus: "idle",
      status: "error",
    });

    const markup = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <GuestsQueryView
          canEdit={false}
          filters={{ search: "", ageGroup: "", tagId: "", sectionId: "" }}
          partnerNames="Ada & Charles"
          weddingId="wedding_1"
        />
      </QueryClientProvider>,
    );

    expect(markup).toContain("Guest list");
    expect(markup).toContain("Live guest refresh failed");
    expect(markup).not.toContain("Loading your guest list…");
  });

  it("shows the safe error state instead of a skeleton after a cold request fails", async () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { refetchOnMount: false, retry: false, retryOnMount: false },
      },
    });

    try {
      await expect(client.fetchQuery({
        queryKey: weddingQueryKeys.dashboard("wedding_1"),
        queryFn: async () => {
          throw new Error("request failed");
        },
      })).rejects.toThrow("request failed");

      const markup = renderToStaticMarkup(
        <QueryClientProvider client={client}>
          <DashboardQueryView
            presentation={{
              userFirstName: "Ada",
              weddingName: "Ada & Charles",
              partnerNames: "Ada & Charles",
              weddingDate: "2030-06-01T00:00:00.000Z",
              timezone: "Europe/London",
              locationSummary: null,
            }}
            weddingId="wedding_1"
          />
        </QueryClientProvider>,
      );

      expect(markup).toContain("Dashboard unavailable");
      expect(markup).not.toContain("Loading your dashboard…");
    } finally {
      client.clear();
    }
  });

  it("uses exact Guests filter keys for cold and cached combinations", () => {
    const cachedFilters = {
      search: "Ada",
      ageGroup: "ADULT",
      tagId: "tag_1",
      sectionId: "section_1",
    };
    const client = clientWith(
      weddingQueryKeys.guests("wedding_1", cachedFilters),
      guestsData,
    );

    const cachedMarkup = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <GuestsQueryView
          canEdit={false}
          filters={cachedFilters}
          partnerNames="Ada & Charles"
          weddingId="wedding_1"
        />
      </QueryClientProvider>,
    );
    const coldMarkup = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <GuestsQueryView
          canEdit={false}
          filters={{ ...cachedFilters, search: "Charles" }}
          partnerNames="Ada & Charles"
          weddingId="wedding_1"
        />
      </QueryClientProvider>,
    );

    expect(cachedMarkup).toContain("Guest list");
    expect(cachedMarkup).not.toContain("Loading your guest list…");
    expect(coldMarkup).toContain("Loading your guest list…");
  });
});
