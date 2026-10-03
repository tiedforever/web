"use client";

import { useState } from "react";

import { TaskActions } from "./task-actions";
import { TaskStatusButton } from "./task-status-button";
import type {
  ChecklistCategoryOption,
  ChecklistMember,
  TaskViewModel,
} from "./types";

type TaskRowProps = TaskViewModel & {
  canEdit: boolean;
  categories: ChecklistCategoryOption[];
  members: ChecklistMember[];
};

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function priorityClass(priority: string) {
  switch (priority) {
    case "HIGH":
    case "URGENT":
      return "text-[#9D3F32]";
    case "MEDIUM":
      return "text-[#B07C1A]";
    case "LOW":
      return "text-[#4A7C57]";
    default:
      return "text-[#6B6B63]";
  }
}

function assigneeLabel(task: TaskViewModel["task"]) {
  if (!task.assignee) return "Unassigned";

  if (task.assignee.user) {
    return `${task.assignee.user.firstName} ${task.assignee.user.lastName}`;
  }

  return "Assigned";
}

export function TaskRow({
  canEdit,
  categories,
  completeAction,
  deleteAction,
  members,
  reopenAction,
  task,
  updateAction,
}: TaskRowProps) {
  const [optimisticStatus, setOptimisticStatus] = useState(task.status);

  const completed = optimisticStatus === "COMPLETED";
  const dueDate = formatDate(task.dueDate);

  return (
    <li className="relative flex items-start gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-[#F7F7F4]">
      {canEdit ? (
        <TaskStatusButton
          completed={completed}
          completeAction={completeAction}
          onOptimisticChange={(nextCompleted) =>
            setOptimisticStatus(nextCompleted ? "COMPLETED" : "NOT_STARTED")
          }
          reopenAction={reopenAction}
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3
              className={`truncate text-[13.5px] font-medium ${completed ? "text-[#8A8A82] line-through" : "text-[#1C1C1C]"}`}
            >
              {task.title}
            </h3>
            {task.description ? (
              <p className="mt-0.5 truncate text-[11.5px] text-[#8A8A82]">
                {task.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[#8A8A82]">
          {dueDate ? <span className="whitespace-nowrap">Due {dueDate}</span> : null}
          {task.assignee ? (
            <span className="min-w-0 max-w-full truncate whitespace-nowrap">{assigneeLabel(task)}</span>
          ) : null}
          <span className={`whitespace-nowrap font-medium ${priorityClass(task.priority)}`}>
            {formatStatus(task.priority)}
          </span>
          <span className={`whitespace-nowrap ${completed ? "text-[#8A8A82]" : "text-[#6B6B63]"}`}>
            {formatStatus(optimisticStatus)}
          </span>
        </div>
      </div>

      {canEdit ? (
        <TaskActions
          categories={categories}
          deleteAction={deleteAction}
          members={members}
          task={task}
          updateAction={updateAction}
        />
      ) : null}
    </li>
  );
}
