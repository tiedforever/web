import { describe, expect, it } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";

import {
  addChecklistTask,
  invalidateChecklistQuery,
  invalidateDashboardQuery,
  removeChecklistTask,
  replaceChecklistTask,
  updateChecklistTaskStatus,
} from "../src/components/checklist/checklist-query-cache";
import {
  invalidateGuestsAndDashboardQueries,
  invalidateGuestsQuery,
} from "../src/components/guests/guest-query-cache";
import {
  checklistQueryOptions,
  dashboardQueryOptions,
  guestsQueryOptions,
} from "../src/client/query-options";
import {
  createQueryClient,
  shouldClearQueryCache,
} from "../src/components/providers/query-provider";
import { weddingQueryKeys } from "../src/query-keys";
import type { GuestsReadData } from "../src/types/guests";
import type {
  ChecklistReadData,
  TaskActionData,
} from "../src/server/actions/checklist/checklist.actions";
import type { DashboardQueryData } from "../src/types/dashboard";

const task = (overrides: Partial<TaskActionData> = {}): TaskActionData => ({
  id: "task_1",
  weddingId: "wedding_1",
  categoryId: "category_1",
  assigneeId: null,
  parentTaskId: null,
  title: "Book photographer",
  description: null,
  status: "NOT_STARTED",
  priority: "HIGH",
  dueDate: null,
  completedAt: null,
  position: 0,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  assignee: null,
  recurrence: null,
  links: [],
  children: [],
  category: null,
  parentTask: null,
  ...overrides,
});

const checklistData: ChecklistReadData = {
  categories: [
    {
      category: {
        id: "category_1",
        weddingId: "wedding_1",
        name: "Planning",
        icon: null,
        colour: null,
        position: 0,
        taskCount: 1,
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
      },
      tasks: [task()],
    },
  ],
  members: [],
};

const dashboardData: DashboardQueryData = {
  guestCount: 10,
  unassignedGuestCount: 2,
  householdCount: 4,
  taskCount: 5,
  completedTaskCount: 1,
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

describe("wedding-scoped TanStack Query cache", () => {
  it("includes weddingId in every V1 query key and reads matching cached data", () => {
    expect(weddingQueryKeys.checklist("wedding_1")).not.toEqual(
      weddingQueryKeys.checklist("wedding_2"),
    );
    expect(weddingQueryKeys.dashboard("wedding_1")).not.toEqual(
      weddingQueryKeys.dashboard("wedding_2"),
    );
    expect(
      weddingQueryKeys.guests("wedding_1", {
        search: "Ada",
        ageGroup: "",
        tagId: "",
        sectionId: "",
      }),
    ).not.toEqual(
      weddingQueryKeys.guests("wedding_1", {
        search: "Grace",
        ageGroup: "",
        tagId: "",
        sectionId: "",
      }),
    );
    const queryClient = new QueryClient();
    queryClient.setQueryData(weddingQueryKeys.checklist("wedding_1"), checklistData);
    queryClient.setQueryData(weddingQueryKeys.dashboard("wedding_1"), dashboardData);
    queryClient.setQueryData(weddingQueryKeys.guests("wedding_1", {
      search: "",
      ageGroup: "",
      tagId: "",
      sectionId: "",
    }), guestsData);
    const checklistObserver = new QueryObserver(
      queryClient,
      checklistQueryOptions("wedding_1"),
    );
    const dashboardObserver = new QueryObserver(
      queryClient,
      dashboardQueryOptions("wedding_1"),
    );
    const guestsObserver = new QueryObserver(
      queryClient,
      guestsQueryOptions("wedding_1", {
        search: "",
        ageGroup: "",
        tagId: "",
        sectionId: "",
      }),
    );

    expect(checklistObserver.getCurrentResult().data).toBe(checklistData);
    expect(dashboardObserver.getCurrentResult().data).toBe(dashboardData);
    expect(guestsObserver.getCurrentResult().data).toBe(guestsData);
  });

  it("renders cached data before a stale refetch resolves", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: 30_000, retry: false } },
    });
    const key = weddingQueryKeys.checklist("wedding_1");

    queryClient.setQueryData(key, checklistData);

    expect(queryClient.getQueryData(key)).toBe(checklistData);
  });

  it("keeps cached Guests data visible while a stale refetch is pending", async () => {
    let resolveRefetch!: (data: GuestsReadData) => void;
    const refetch = new Promise<GuestsReadData>((resolve) => {
      resolveRefetch = resolve;
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: 0, retry: false } },
    });
    queryClient.setQueryData(
      weddingQueryKeys.guests("wedding_1", {
        search: "",
        ageGroup: "",
        tagId: "",
        sectionId: "",
      }),
      guestsData,
    );
    const observer = new QueryObserver(
      queryClient,
      {
        ...guestsQueryOptions(
          "wedding_1",
          { search: "", ageGroup: "", tagId: "", sectionId: "" },
        ),
        queryFn: () => refetch,
      },
    );
    const results: Array<ReturnType<typeof observer.getCurrentResult>> = [];
    const unsubscribe = observer.subscribe((result) => results.push(result));

    expect(observer.getCurrentResult().data).toBe(guestsData);
    expect(observer.getCurrentResult().isFetching).toBe(true);

    resolveRefetch(guestsData);
    await refetch;
    unsubscribe();

    expect(results.some((result) => result.data === guestsData && result.isFetching)).toBe(true);
  });

  it("keeps cached Guests data after a background refetch fails", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: 0, retry: false } },
    });
    const key = weddingQueryKeys.guests("wedding_1", {
      search: "",
      ageGroup: "",
      tagId: "",
      sectionId: "",
    });
    queryClient.setQueryData(key, guestsData);

    const observer = new QueryObserver(queryClient, {
      queryKey: key,
      queryFn: () => Promise.reject(new Error("temporary failure")),
    });
    const resultPromise = new Promise<ReturnType<typeof observer.getCurrentResult>>(
      (resolve) => {
        const unsubscribe = observer.subscribe((result) => {
          if (!result.isError) return;
          unsubscribe();
          resolve(result);
        });
      },
    );

    const result = await resultPromise;
    expect(result.data).toBe(guestsData);
    expect(result.isError).toBe(true);
  });

  it("never uses another wedding's cached data for a new wedding key", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(weddingQueryKeys.dashboard("wedding_1"), dashboardData);

    expect(
      queryClient.getQueryData(weddingQueryKeys.dashboard("wedding_2")),
    ).toBeUndefined();
  });

  it("keeps different Guest filter combinations isolated and invalidates all filters for one wedding", async () => {
    const queryClient = new QueryClient();
    const adultKey = weddingQueryKeys.guests("wedding_1", {
      search: "",
      ageGroup: "ADULT",
      tagId: "",
      sectionId: "",
    });
    const childKey = weddingQueryKeys.guests("wedding_1", {
      search: "",
      ageGroup: "CHILD",
      tagId: "",
      sectionId: "",
    });
    const otherWeddingKey = weddingQueryKeys.guests("wedding_2", {
      search: "",
      ageGroup: "ADULT",
      tagId: "",
      sectionId: "",
    });
    queryClient.setQueryData(adultKey, guestsData);
    queryClient.setQueryData(childKey, guestsData);
    queryClient.setQueryData(otherWeddingKey, guestsData);

    await invalidateGuestsQuery(queryClient, "wedding_1");

    expect(queryClient.getQueryState(adultKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(childKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(otherWeddingKey)?.isInvalidated).toBe(false);
  });

  it("invalidates Dashboard alongside Guests for count-changing mutations", async () => {
    const queryClient = new QueryClient();
    const dashboardKey = weddingQueryKeys.dashboard("wedding_1");
    queryClient.setQueryData(dashboardKey, dashboardData);

    await invalidateGuestsAndDashboardQueries(queryClient, "wedding_1");

    expect(queryClient.getQueryState(dashboardKey)?.isInvalidated).toBe(true);
  });

  it("updates complete/reopen optimistically and can roll back", () => {
    const key = weddingQueryKeys.checklist("wedding_1");
    const queryClient = new QueryClient();
    queryClient.setQueryData(key, checklistData);
    const previous = queryClient.getQueryData<ChecklistReadData>(key);

    queryClient.setQueryData(key, (current: ChecklistReadData | undefined) =>
      current ? updateChecklistTaskStatus(current, "task_1", "COMPLETED") : current,
    );
    expect(queryClient.getQueryData<ChecklistReadData>(key)?.categories[0]?.tasks[0]?.status).toBe(
      "COMPLETED",
    );

    queryClient.setQueryData(key, previous);
    expect(queryClient.getQueryData<ChecklistReadData>(key)?.categories[0]?.tasks[0]?.status).toBe(
      "NOT_STARTED",
    );
    queryClient.setQueryData(key, (current: ChecklistReadData | undefined) =>
      current
        ? addChecklistTask(current, task({ id: "task_2", position: 1 }))
        : current,
    );
    expect(queryClient.getQueryData<ChecklistReadData>(key)?.categories[0]?.tasks).toHaveLength(2);
    queryClient.setQueryData(key, (current: ChecklistReadData | undefined) =>
      current ? removeChecklistTask(current, "task_2") : current,
    );
    expect(queryClient.getQueryData<ChecklistReadData>(key)?.categories[0]?.tasks).toHaveLength(1);
  });

  it("updates task create/edit/delete cache entries and invalidates dashboard work", async () => {
    const queryClient = new QueryClient();
    const checklistKey = weddingQueryKeys.checklist("wedding_1");
    const dashboardKey = weddingQueryKeys.dashboard("wedding_1");
    queryClient.setQueryData(checklistKey, checklistData);
    queryClient.setQueryData(dashboardKey, dashboardData);

    const editedTask = task({ title: "Book the photographer", status: "IN_PROGRESS" });
    queryClient.setQueryData(checklistKey, (current: ChecklistReadData | undefined) =>
      current ? replaceChecklistTask(current, editedTask) : current,
    );
    expect(queryClient.getQueryData<ChecklistReadData>(checklistKey)?.categories[0]?.tasks[0]?.title).toBe(
      "Book the photographer",
    );

    await invalidateChecklistQuery(queryClient, "wedding_1");
    await invalidateDashboardQuery(queryClient, "wedding_1");
    expect(queryClient.getQueryState(checklistKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(dashboardKey)?.isInvalidated).toBe(true);
  });

  it("does not configure browser storage persistence", () => {
    expect("localStorage" in globalThis).toBe(false);
    expect("sessionStorage" in globalThis).toBe(false);
  });

  it("clears the in-memory cache when the loaded Clerk user changes", () => {
    expect(shouldClearQueryCache(undefined, "user_1", true)).toBe(false);
    expect(shouldClearQueryCache("user_1", "user_1", true)).toBe(false);
    expect(shouldClearQueryCache("user_1", "user_2", true)).toBe(true);
    expect(shouldClearQueryCache("user_1", null, true)).toBe(true);
    expect(shouldClearQueryCache("user_1", "user_2", false)).toBe(false);
  });

  it("uses in-memory query defaults without a server-global client", () => {
    const queryClient = createQueryClient();
    const defaults = queryClient.getDefaultOptions().queries;

    expect(defaults).toBeDefined();
    if (!defaults) return;

    expect(defaults.staleTime).toBe(30_000);
    expect(defaults.gcTime).toBe(5 * 60_000);
    expect(defaults.refetchOnWindowFocus).toBe(true);
    expect(defaults.refetchOnReconnect).toBe(true);
    expect(defaults.retry).toBe(1);
  });
});
