"use client";

import { useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";

import type {
  ChecklistCategoryOption,
  ChecklistMember,
  CreateTaskAction,
  UpdateTaskAction,
} from "./types";

type TaskFormMode = "create" | "edit";

export type TaskFormValues = {
  categoryId?: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeId: string | null;
};

type TaskFormProps = {
  action: CreateTaskAction | UpdateTaskAction;
  categories?: ChecklistCategoryOption[];
  initialValues?: Partial<TaskFormValues>;
  members: ChecklistMember[];
  mode: TaskFormMode;
  onCancel?: () => void;
  onSuccess?: () => void;
  submitLabel?: string;
};

const statusOptions = [
  ["NOT_STARTED", "Not started"],
  ["IN_PROGRESS", "In progress"],
  ["WAITING", "Waiting"],
  ["COMPLETED", "Completed"],
  ["CANCELLED", "Cancelled"],
] as const;

function dateInputValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

export function TaskForm({
  action,
  categories = [],
  initialValues,
  members,
  mode,
  onCancel,
  onSuccess,
  submitLabel = mode === "edit" ? "Save changes" : "Add task",
}: TaskFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();

    if (!title) {
      setIsError(true);
      setMessage("Task title is required.");
      return;
    }

    const description = String(formData.get("description") ?? "").trim();
    const dueDate = String(formData.get("dueDate") ?? "").trim();
    const assigneeId = String(formData.get("assigneeId") ?? "").trim();
    const priority = String(formData.get("priority") ?? "MEDIUM");

    const input =
      mode === "edit"
        ? {
            categoryId: String(formData.get("categoryId") ?? ""),
            title,
            description: description || null,
            status: String(formData.get("status") ?? "NOT_STARTED"),
            priority,
            dueDate: dueDate || null,
            assigneeId: assigneeId || null,
          }
        : {
            title,
            description: description || undefined,
            priority,
            dueDate: dueDate || undefined,
            ...(assigneeId ? { assigneeId } : {}),
          };

    setMessage(null);
    setIsError(false);

    startTransition(async () => {
      try {
        const result = await action(input);

        if (!result.success) {
          setIsError(true);
          setMessage(result.error);
          return;
        }

        formRef.current?.reset();
        setIsError(false);
        setMessage(null);
        onSuccess?.();
      } catch {
        setIsError(true);
        setMessage("Unable to save the task. Please try again.");
      }
    });
  }

  return (
    <form ref={formRef} className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        {mode === "edit" ? (
          <label>
            <span className="mb-1 block text-xs font-medium text-[#6B6B63]">Category</span>
            <select
              className="w-full rounded-[10px] border border-[#E8E8E3] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
              defaultValue={initialValues?.categoryId ?? ""}
              name="categoryId"
              required
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {mode === "edit" ? (
          <label>
            <span className="mb-1 block text-xs font-medium text-[#6B6B63]">Status</span>
            <select
              className="w-full rounded-[10px] border border-[#E8E8E3] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
              defaultValue={initialValues?.status ?? "NOT_STARTED"}
              name="status"
            >
              {statusOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-[#6B6B63]">Title</span>
          <input
            autoFocus
            data-modal-autofocus
            required
            defaultValue={initialValues?.title ?? ""}
            name="title"
            type="text"
            maxLength={200}
            placeholder="What needs doing?"
            className="w-full rounded-[10px] border border-[#E8E8E3] px-3 py-2 text-sm outline-none transition focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
          />
        </label>

        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-[#6B6B63]">
            Description
          </span>
          <textarea
            defaultValue={initialValues?.description ?? ""}
            name="description"
            rows={3}
            maxLength={10_000}
            placeholder="Optional notes"
            className="w-full resize-y rounded-[10px] border border-[#E8E8E3] px-3 py-2 text-sm outline-none transition focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
          />
        </label>

        <label>
          <span className="mb-1 block text-xs font-medium text-[#6B6B63]">Priority</span>
          <select
            name="priority"
            defaultValue={initialValues?.priority ?? "MEDIUM"}
            className="w-full rounded-[10px] border border-[#E8E8E3] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </label>

        <label>
          <span className="mb-1 block text-xs font-medium text-[#6B6B63]">Due date</span>
          <input
            defaultValue={dateInputValue(initialValues?.dueDate)}
            name="dueDate"
            type="date"
            className="w-full rounded-[10px] border border-[#E8E8E3] px-3 py-2 text-sm outline-none transition focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
          />
        </label>

        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-[#6B6B63]">
            Assignee
          </span>
          <select
            className="w-full rounded-[10px] border border-[#E8E8E3] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
            defaultValue={initialValues?.assigneeId ?? ""}
            name="assigneeId"
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.firstName} {member.lastName}
              </option>
            ))}
          </select>
        </label>
      </div>

      {message ? (
        <p
          aria-live="polite"
          className={isError ? "text-sm text-red-600" : "text-sm text-emerald-700"}
        >
          {message}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 border-t border-[#F0EFEA] pt-4">
        <button
          className="rounded-[10px] px-4 py-2 text-sm font-medium text-[#6B6B63] transition hover:bg-[#F4F4F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A27] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending}
          formNoValidate
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-[10px] bg-[#2D5A27] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#245020] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
