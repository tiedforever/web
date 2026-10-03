import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import {
  DelayedLoadingCard,
  DelayedLoadingController,
  MIN_LOADING_VISIBLE_TIME,
  NAVIGATION_LOADING_DELAY,
} from "../src/components/shared/delayed-loading";
import { shouldShowQuerySkeleton } from "../src/components/shared/loading-skeleton";

describe("delayed loading experience", () => {
  it("does not show before the navigation delay", () => {
    vi.useFakeTimers();
    try {
      const visibility: boolean[] = [];
      const controller = new DelayedLoadingController((visible) => visibility.push(visible));

      controller.start("route");
      vi.advanceTimersByTime(NAVIGATION_LOADING_DELAY - 1);

      expect(visibility).toEqual([]);
      controller.dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows after the navigation delay", () => {
    vi.useFakeTimers();
    try {
      const visibility: boolean[] = [];
      const controller = new DelayedLoadingController((visible) => visibility.push(visible));

      controller.start("route");
      vi.advanceTimersByTime(NAVIGATION_LOADING_DELAY);

      expect(visibility).toEqual([true]);
      controller.dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it("never flashes for a fast load", () => {
    vi.useFakeTimers();
    try {
      const visibility: boolean[] = [];
      const controller = new DelayedLoadingController((visible) => visibility.push(visible));

      controller.start("route");
      vi.advanceTimersByTime(NAVIGATION_LOADING_DELAY - 1);
      controller.stop("route");
      vi.runAllTimers();

      expect(visibility).toEqual([]);
      controller.dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps one shared delay when route loading hands off to a query", () => {
    vi.useFakeTimers();
    try {
      const visibility: boolean[] = [];
      const controller = new DelayedLoadingController((visible) => visibility.push(visible));

      controller.start("route");
      vi.advanceTimersByTime(1_000);
      controller.stop("route");
      controller.start("dashboard-data");
      vi.advanceTimersByTime(499);

      expect(visibility).toEqual([]);
      vi.advanceTimersByTime(1);
      expect(visibility).toEqual([true]);
      controller.stop("dashboard-data");
      vi.advanceTimersByTime(MIN_LOADING_VISIBLE_TIME);
      controller.dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the card visible for the minimum duration", () => {
    vi.useFakeTimers();
    try {
      const visibility: boolean[] = [];
      const controller = new DelayedLoadingController((visible) => visibility.push(visible));

      controller.start("route");
      vi.advanceTimersByTime(NAVIGATION_LOADING_DELAY);
      controller.stop("route");
      vi.advanceTimersByTime(MIN_LOADING_VISIBLE_TIME - 1);

      expect(visibility).toEqual([true]);
      vi.advanceTimersByTime(1);
      expect(visibility).toEqual([true, false]);
      controller.dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps a visible card accessible and reduced-motion friendly", () => {
    const markup = renderToStaticMarkup(<DelayedLoadingCard />);

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-label="Loading your wedding…"');
    expect(markup).toContain("Loading your wedding…");
    expect(markup).toContain("motion-reduce:animate-none");
  });

  it("only lets a cold query own the page skeleton when no route card is visible", () => {
    expect(
      shouldShowQuerySkeleton({
        hasData: false,
        isPending: true,
        routeLoadingVisible: false,
      }),
    ).toBe(true);
    expect(
      shouldShowQuerySkeleton({
        hasData: true,
        isPending: true,
        routeLoadingVisible: false,
      }),
    ).toBe(false);
    expect(
      shouldShowQuerySkeleton({
        hasData: false,
        isPending: false,
        routeLoadingVisible: false,
      }),
    ).toBe(false);
    expect(
      shouldShowQuerySkeleton({
        hasData: false,
        isPending: true,
        routeLoadingVisible: true,
      }),
    ).toBe(false);
  });
});
