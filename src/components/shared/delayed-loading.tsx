"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const NAVIGATION_LOADING_DELAY = 1_500;
export const MIN_LOADING_VISIBLE_TIME = 350;

type VisibilityListener = (visible: boolean) => void;

export type DelayedLoadingArea = "dashboard" | "checklist" | "guests" | "other";

/**
 * Coordinates delayed loading UI for route suspense in the persistent app
 * shell. Destination data misses use their own page-specific skeletons.
 */
export class DelayedLoadingController {
  private readonly activeRequests = new Set<string>();
  private delayTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;
  private visibleSince: number | null = null;
  private visible = false;
  private disposed = false;

  constructor(private readonly onVisibilityChange: VisibilityListener) {}

  start(key: string) {
    if (this.disposed) this.disposed = false;

    this.activeRequests.add(key);
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    if (this.visible || this.delayTimer) return;

    this.delayTimer = setTimeout(() => {
      this.delayTimer = null;
      if (this.activeRequests.size === 0) return;

      this.visible = true;
      this.visibleSince = Date.now();
      this.onVisibilityChange(true);
    }, NAVIGATION_LOADING_DELAY);
  }

  stop(key: string) {
    if (!this.activeRequests.delete(key) || this.activeRequests.size > 0) return;

    if (!this.visible) {
      // Route suspense and the destination query can change ownership in the
      // same effect flush. Give the next owner a chance to start before
      // cancelling the shared delay.
      if (!this.settleTimer) {
        this.settleTimer = setTimeout(() => {
          this.settleTimer = null;
          if (this.activeRequests.size > 0) return;
          if (this.delayTimer) clearTimeout(this.delayTimer);
          this.delayTimer = null;
        }, 0);
      }
      return;
    }

    if (this.delayTimer) {
      clearTimeout(this.delayTimer);
      this.delayTimer = null;
    }

    if (this.visibleSince === null) return;

    const elapsed = Date.now() - this.visibleSince;
    const remaining = Math.max(0, MIN_LOADING_VISIBLE_TIME - elapsed);
    this.hideTimer = setTimeout(() => {
      this.hideTimer = null;
      if (this.activeRequests.size > 0) return;

      this.visible = false;
      this.visibleSince = null;
      this.onVisibilityChange(false);
    }, remaining);
  }

  dispose() {
    if (this.delayTimer) clearTimeout(this.delayTimer);
    if (this.hideTimer) clearTimeout(this.hideTimer);
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.delayTimer = null;
    this.hideTimer = null;
    this.settleTimer = null;
    this.activeRequests.clear();
    this.visible = false;
    this.visibleSince = null;
    this.disposed = true;
  }
}

type DelayedLoadingContextValue = {
  isVisible: boolean;
  startLoading: (key: string) => void;
  stopLoading: (key: string) => void;
};

const noop = () => undefined;
const DelayedLoadingContext = createContext<DelayedLoadingContextValue>({
  isVisible: false,
  startLoading: noop,
  stopLoading: noop,
});

export function DelayedLoadingProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [controller] = useState(
    () => new DelayedLoadingController(setIsVisible),
  );
  useEffect(() => () => controller.dispose(), [controller]);

  const startLoading = useCallback(
    (key: string) => controller.start(key),
    [controller],
  );
  const stopLoading = useCallback(
    (key: string) => controller.stop(key),
    [controller],
  );

  const contextValue = useMemo<DelayedLoadingContextValue>(
    () => ({
      isVisible,
      startLoading,
      stopLoading,
    }),
    [isVisible, startLoading, stopLoading],
  );

  return (
    <DelayedLoadingContext.Provider value={contextValue}>
      <div className="relative min-h-[420px]">
        {children}
        {isVisible ? (
          <div
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-6"
          >
            <DelayedLoadingCard />
          </div>
        ) : null}
      </div>
    </DelayedLoadingContext.Provider>
  );
}

export function useDelayedLoading(key: string, active: boolean) {
  const { startLoading, stopLoading } = useContext(DelayedLoadingContext);

  useEffect(() => {
    if (!active) return;

    startLoading(key);
    return () => stopLoading(key);
  }, [active, key, startLoading, stopLoading]);
}

export function useDelayedLoadingVisible() {
  return useContext(DelayedLoadingContext).isVisible;
}

export function DelayedLoadingCard({
  label = "Loading your wedding…",
}: {
  label?: string;
}) {
  return (
    <div
      aria-atomic="true"
      aria-label={label}
      className="flex items-center gap-3 rounded-xl border border-[#E4E0D4] bg-white px-5 py-4 text-sm font-medium text-[#3F413A] shadow-[0_8px_24px_rgba(28,28,28,0.10)]"
      role="status"
    >
      <span
        aria-hidden="true"
        className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#DDEBD9] border-t-[#2D5A27] motion-reduce:animate-none"
      />
      <span>{label}</span>
    </div>
  );
}

/** A marker used by route loading files; PageTransition keeps the prior page. */
export function DelayedLoadingFallback({
  area = "other",
}: {
  area?: DelayedLoadingArea;
}) {
  return <span aria-hidden="true" data-loading-area={area} hidden />;
}

export function isDelayedLoadingFallback(node: ReactNode) {
  return (
    typeof node === "object" && node !== null && "type" in node &&
    node.type === DelayedLoadingFallback
  );
}

export function getDelayedLoadingFallbackArea(node: ReactNode): DelayedLoadingArea | null {
  if (!isDelayedLoadingFallback(node)) return null;

  if (typeof node === "object" && node !== null && "props" in node) {
    const props = node.props;
    if (
      typeof props === "object" &&
      props !== null &&
      "area" in props &&
      (props.area === "dashboard" ||
        props.area === "checklist" ||
        props.area === "guests" ||
        props.area === "other")
    ) {
      return props.area;
    }
  }

  return "other";
}
