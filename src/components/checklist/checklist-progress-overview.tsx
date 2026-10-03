import { ProgressBar } from "../shared/ui";

type ChecklistProgressOverviewProps = {
  completedCount: number;
  totalCount: number;
  completionPercentage: number;
};

export function ChecklistProgressOverview({
  completedCount,
  totalCount,
  completionPercentage,
}: ChecklistProgressOverviewProps) {
  return (
    <section aria-label="Checklist progress" className="max-w-2xl">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-[13.5px] font-medium text-[#6B6B63]">
          <span className="font-semibold text-[#1C1C1C]">
            {completedCount} of {totalCount} tasks completed
          </span>
          <span className="mx-1.5 text-[#B5B5AC]">·</span>
          {completionPercentage}%
        </p>
      </div>
      <ProgressBar value={completedCount} max={totalCount} height="h-2" />
    </section>
  );
}
