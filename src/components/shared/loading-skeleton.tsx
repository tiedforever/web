import type { ReactNode } from "react";

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-[#EDEDE8] motion-reduce:animate-none ${className}`}
    />
  );
}

export function LoadingSkeletonStatus({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div aria-busy="true" aria-live="polite" role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

export function shouldShowQuerySkeleton({
  hasData,
  isPending,
  routeLoadingVisible,
}: {
  hasData: boolean;
  isPending: boolean;
  routeLoadingVisible: boolean;
}) {
  return isPending && !hasData && !routeLoadingVisible;
}
