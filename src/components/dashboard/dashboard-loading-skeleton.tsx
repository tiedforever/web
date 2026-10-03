import { Card } from "@/src/components/shared/ui";

import {
  LoadingSkeletonStatus,
  SkeletonBlock,
} from "@/src/components/shared/loading-skeleton";

export function DashboardLoadingSkeleton() {
  return (
    <LoadingSkeletonStatus label="Loading your dashboard…">
      <div className="space-y-6 pb-8 sm:space-y-8">
        <div className="space-y-2">
          <SkeletonBlock className="h-3 w-28" />
          <SkeletonBlock className="h-8 w-64" />
          <SkeletonBlock className="h-4 w-80 max-w-full" />
        </div>

        <section className="rounded-[16px] bg-[#24472D] p-6 shadow-[0_8px_24px_rgba(24,51,33,0.12)] sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-3">
              <SkeletonBlock className="h-3 w-32 bg-[#52725A]" />
              <SkeletonBlock className="h-14 w-40 bg-[#52725A]" />
              <SkeletonBlock className="h-4 w-44 bg-[#52725A]" />
              <SkeletonBlock className="h-3 w-64 max-w-full bg-[#52725A]" />
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/15 border-t border-white/15 pt-6 lg:min-w-[390px] lg:border-t-0 lg:pt-0">
              {Array.from({ length: 3 }, (_, index) => (
                <div className="space-y-2 px-4 first:pl-0 last:pr-0 sm:px-6" key={index}>
                  <SkeletonBlock className="mx-auto h-8 w-16 bg-[#52725A]" />
                  <SkeletonBlock className="mx-auto h-2.5 w-20 bg-[#52725A]" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Card className="min-w-0 p-4 sm:p-5" key={index}>
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-2">
                  <SkeletonBlock className="h-3 w-20" />
                  <SkeletonBlock className="h-7 w-14" />
                </div>
                <SkeletonBlock className="h-8 w-8 rounded-lg" />
              </div>
              <SkeletonBlock className="mt-3 h-2.5 w-28" />
            </Card>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          {Array.from({ length: 2 }, (_, index) => (
            <Card className="min-h-[220px] p-5 sm:p-6" key={index}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <SkeletonBlock className="h-4 w-32" />
                  <SkeletonBlock className="h-3 w-56 max-w-full" />
                </div>
                <SkeletonBlock className="h-5 w-5 rounded-full" />
              </div>
              <div className="mt-6 space-y-3">
                {Array.from({ length: index === 0 ? 3 : 2 }, (_, row) => (
                  <SkeletonBlock className="h-12 w-full" key={row} />
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          {Array.from({ length: 2 }, (_, index) => (
            <Card className="min-h-[180px] p-5 sm:p-6" key={index}>
              <div className="space-y-2">
                <SkeletonBlock className="h-4 w-36" />
                <SkeletonBlock className="h-3 w-64 max-w-full" />
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }, (_, item) => (
                  <SkeletonBlock className="h-14 w-full" key={item} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </LoadingSkeletonStatus>
  );
}
