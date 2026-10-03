"use client";

import { useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";

import { categoryColourOptions, categoryIconOptions } from "./category-options";
import type { CreateCategoryAction } from "./types";

type CreateCategoryFormProps = {
  action: CreateCategoryAction;
  embedded?: boolean;
  initialValues?: {
    name: string;
    icon: string | null;
    colour: string | null;
  };
  onSuccess?: () => void;
  submitLabel?: string;
  successMessage?: string;
};

export function CreateCategoryForm({
  action,
  embedded = false,
  initialValues,
  onSuccess,
  submitLabel = "Add category",
  successMessage = "Category added.",
}: CreateCategoryFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();

    if (!name) {
      setIsError(true);
      setMessage("Category name is required.");
      return;
    }

    const input = {
      name,
      icon: String(formData.get("icon") ?? "").trim() || undefined,
      colour: String(formData.get("colour") ?? "").trim() || undefined,
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
        setMessage(successMessage);
        onSuccess?.();
      } catch {
        setIsError(true);
        setMessage("Unable to save the category. Please try again.");
      }
    });
  }

  return (
    <form
      ref={formRef}
      className={
        embedded
          ? "w-full"
          : "w-full rounded-[14px] border border-[#E8E8E3] bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.08)] lg:max-w-md"
      }
      onSubmit={handleSubmit}
    >
      {!embedded ? (
        <div className="mb-3">
          <h2 className="font-semibold text-[#1C1C1C]">Add a category</h2>
          <p className="mt-1 text-xs text-[#8A8A82]">
            Create a workspace category for your planning tasks.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="sm:col-span-3">
          <span className="mb-1 block text-xs font-medium text-[#6B6B63]">Name</span>
          <input
            required
            name="name"
            type="text"
            maxLength={100}
            placeholder="e.g. Flowers"
            defaultValue={initialValues?.name ?? ""}
            className="w-full rounded-[10px] border border-[#E8E8E3] px-3 py-2 text-sm outline-none transition focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
          />
        </label>

        <label>
          <span className="mb-1 block text-xs font-medium text-[#6B6B63]">Icon</span>
          <select
            name="icon"
            defaultValue={initialValues?.icon ?? ""}
            className="w-full rounded-[10px] border border-[#E8E8E3] px-3 py-2 text-sm outline-none transition focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
          >
            <option value="">No icon</option>
            {categoryIconOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-[#6B6B63]">Colour</span>
          <select
            name="colour"
            defaultValue={initialValues?.colour ?? ""}
            className="w-full rounded-[10px] border border-[#E8E8E3] px-3 py-2 text-sm outline-none transition focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
          >
            <option value="">No colour</option>
            {categoryColourOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p
          aria-live="polite"
          className={isError ? "text-xs text-red-600" : "text-xs text-emerald-700"}
        >
          {message}
        </p>
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
