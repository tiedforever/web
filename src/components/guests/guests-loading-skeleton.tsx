import { Card } from "@/src/components/shared/ui";
import {
  LoadingSkeletonStatus,
  SkeletonBlock,
} from "@/src/components/shared/loading-skeleton";

export function GuestsLoadingSkeleton() {
  return (
    <LoadingSkeletonStatus label="Loading your guest list…">
      <div className="space-y-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-36" />
            <SkeletonBlock className="h-8 w-44" />
            <SkeletonBlock className="h-4 w-80 max-w-full" />
          </div>
          <div className="flex gap-2">
            <SkeletonBlock className="h-10 w-28" />
            <SkeletonBlock className="h-10 w-28" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Card className="flex items-center justify-between gap-4 p-5" key={index}>
              <div className="space-y-2">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="h-8 w-14" />
              </div>
              <SkeletonBlock className="h-11 w-11 rounded-xl" />
            </Card>
          ))}
        </div>

        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <SkeletonBlock className="h-4 w-4 rounded-full" />
            <SkeletonBlock className="h-4 w-28" />
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.5fr)_1fr_1fr_1fr_auto]">
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-10 w-28" />
          </div>
          <div className="mt-4 border-t border-[#F0EFEA] pt-4">
            <SkeletonBlock className="h-9 w-28" />
          </div>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <SkeletonBlock className="h-5 w-28" />
              <SkeletonBlock className="h-3 w-72 max-w-full" />
            </div>
            <SkeletonBlock className="h-6 w-24 rounded-full" />
          </div>

          <Card className="overflow-hidden">
            <div className="hidden grid-cols-[minmax(180px,1.5fr)_minmax(140px,1fr)_minmax(100px,0.7fr)_auto] gap-4 border-b border-[#F0EFEA] bg-[#FAFAF8] px-4 py-3 lg:grid">
              {Array.from({ length: 4 }, (_, index) => (
                <SkeletonBlock className="h-3 w-20" key={index} />
              ))}
            </div>
            <div className="divide-y divide-[#F0EFEA]">
              {Array.from({ length: 6 }, (_, index) => (
                <div className="flex items-center gap-3 px-4 py-4 lg:grid lg:grid-cols-[minmax(180px,1.5fr)_minmax(140px,1fr)_minmax(100px,0.7fr)_auto] lg:items-center lg:gap-4" key={index}>
                  <div className="flex min-w-0 flex-1 items-center gap-3 lg:flex-none">
                    <SkeletonBlock className="h-9 w-9 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2 lg:flex-none">
                      <SkeletonBlock className="h-3.5 w-32" />
                      <SkeletonBlock className="h-2.5 w-24" />
                    </div>
                  </div>
                  <SkeletonBlock className="hidden h-3 w-24 lg:block" />
                  <SkeletonBlock className="hidden h-6 w-16 rounded-full lg:block" />
                  <SkeletonBlock className="h-8 w-8 shrink-0 rounded-lg" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </LoadingSkeletonStatus>
  );
}
