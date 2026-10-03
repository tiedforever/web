import { Card } from "@/src/components/shared/ui";
import {
  LoadingSkeletonStatus,
  SkeletonBlock,
} from "@/src/components/shared/loading-skeleton";

export function ChecklistLoadingSkeleton() {
  return (
    <LoadingSkeletonStatus label="Loading your checklist…">
      <div className="space-y-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-32" />
            <SkeletonBlock className="h-8 w-64" />
            <SkeletonBlock className="h-4 w-48" />
          </div>
          <SkeletonBlock className="h-10 w-36" />
        </div>

        <div className="max-w-2xl space-y-2">
          <SkeletonBlock className="h-4 w-48" />
          <SkeletonBlock className="h-2 w-full rounded-full" />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <SkeletonBlock className="h-10 min-w-[220px] flex-1 sm:max-w-[280px]" />
          <SkeletonBlock className="h-10 w-36" />
          <SkeletonBlock className="h-10 w-32" />
          <SkeletonBlock className="h-10 w-52 sm:ml-auto" />
        </div>

        <div className="space-y-5">
          {Array.from({ length: 3 }, (_, categoryIndex) => (
            <Card className="p-5 sm:p-6" key={categoryIndex}>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                  <SkeletonBlock className="h-5 w-40" />
                  <SkeletonBlock className="h-3 w-24" />
                </div>
                <SkeletonBlock className="h-8 w-8 rounded-lg" />
              </div>
              <div className="mt-5 space-y-2">
                {Array.from({ length: 3 }, (_, taskIndex) => (
                  <div
                    className="flex items-center gap-3 rounded-[10px] border border-[#F0EFEA] bg-[#FAFAF8] px-3 py-3"
                    key={taskIndex}
                  >
                    <SkeletonBlock className="h-7 w-7 rounded-md" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <SkeletonBlock className="h-3.5 w-3/4" />
                      <SkeletonBlock className="h-2.5 w-1/2" />
                    </div>
                    <SkeletonBlock className="h-6 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </LoadingSkeletonStatus>
  );
}
