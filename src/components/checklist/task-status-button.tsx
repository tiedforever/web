"use client";

import { useState, useTransition } from "react";

import type { TaskMutationAction } from "./types";

type TaskStatusButtonProps = {
  completed: boolean;
  completeAction: TaskMutationAction;
  onOptimisticChange: (completed: boolean) => void;
  reopenAction: TaskMutationAction;
};

export function TaskStatusButton({
  completed,
  completeAction,
  onOptimisticChange,
  reopenAction,
}: TaskStatusButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    const nextCompleted = !completed;
    onOptimisticChange(nextCompleted);

    startTransition(async () => {
      try {
        const result = await (nextCompleted ? completeAction : reopenAction)();

        if (!result.success) {
          onOptimisticChange(completed);
          setError(result.error);
        }
      } catch {
        onOptimisticChange(completed);
        setError("Unable to update the task. Please try again.");
      }
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <button
        aria-label={completed ? "Reopen task" : "Complete task"}
        type="button"
        disabled={isPending}
        onClick={handleClick}
        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
          completed
            ? "border-[#2D5A27] bg-[#2D5A27] text-white hover:bg-[#245020]"
            : "border-2 border-[#D0D0CA] bg-white text-transparent hover:border-[#2D5A27]"
        }`}
      >
        {isPending ? "…" : completed ? "✓" : ""}
      </button>
      {error ? (
        <p aria-live="polite" className="max-w-40 text-center text-[10px] text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
