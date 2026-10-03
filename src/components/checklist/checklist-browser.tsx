"use client";

import { useMemo, useState } from "react";

import { CategoryList } from "./category-list";
import {
  ChecklistToolbar,
  type ChecklistStatusFilter,
} from "./checklist-toolbar";
import type { CategoryViewModel } from "./types";

type ChecklistBrowserProps = {
  canEdit: boolean;
  categories: CategoryViewModel[];
  priorities: string[];
};

export type ChecklistFilterState = {
  categoryId: string;
  priority: string;
  search: string;
  status: ChecklistStatusFilter;
};

export function filterChecklistCategories(
  categories: CategoryViewModel[],
  { categoryId, priority, search, status }: ChecklistFilterState,
) {
  const normalizedSearch = search.trim().toLowerCase();
  const hasTaskFilters =
    normalizedSearch.length > 0 || priority !== "all" || status !== "all";

  return categories
    .filter(({ category }) => categoryId === "all" || category.id === categoryId)
    .map((categoryViewModel) => ({
      ...categoryViewModel,
      tasks: categoryViewModel.tasks.filter(({ task }) => {
        const assignee = task.assignee?.user
          ? `${task.assignee.user.firstName} ${task.assignee.user.lastName}`
          : "";
        const searchableText = [task.title, task.description ?? "", assignee]
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          normalizedSearch.length === 0 || searchableText.includes(normalizedSearch);
        const matchesPriority =
          priority === "all" || task.priority.toLowerCase() === priority.toLowerCase();
        const matchesStatus =
          status === "all" ||
          (status === "done" && task.status === "COMPLETED") ||
          (status === "todo" && task.status !== "COMPLETED");

        return matchesSearch && matchesPriority && matchesStatus;
      }),
    }))
    .filter(({ tasks }) => !hasTaskFilters || tasks.length > 0);
}

export function ChecklistBrowser({
  canEdit,
  categories,
  priorities,
}: ChecklistBrowserProps) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [priority, setPriority] = useState("all");
  const [status, setStatus] = useState<ChecklistStatusFilter>("all");

  const categoryOptions = useMemo(
    () => categories.map(({ category }) => ({ id: category.id, name: category.name })),
    [categories],
  );

  const filteredCategories = useMemo(
    () => filterChecklistCategories(categories, { categoryId, priority, search, status }),
    [categories, categoryId, priority, search, status],
  );

  const emptyState = categories.length > 0 && filteredCategories.length === 0;

  return (
    <div className="space-y-5">
      <ChecklistToolbar
        categories={categoryOptions}
        categoryId={categoryId}
        completedCount={categories
          .flatMap(({ tasks }) => tasks)
          .filter(({ task }) => task.status === "COMPLETED").length}
        incompleteCount={categories
          .flatMap(({ tasks }) => tasks)
          .filter(({ task }) => task.status !== "COMPLETED").length}
        onCategoryChange={setCategoryId}
        onPriorityChange={setPriority}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        priorities={priorities}
        priority={priority}
        search={search}
        status={status}
        totalCount={categories.reduce((count, category) => count + category.tasks.length, 0)}
      />

      {emptyState ? (
        <div className="rounded-xl border border-dashed border-[#E4E0D4] bg-white px-6 py-10 text-center">
          <h2 className="text-[15px] font-semibold text-[#1C1C1C]">No matching tasks</h2>
          <p className="mx-auto mt-2 max-w-md text-[13.5px] text-[#8A8A82]">
            Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        <CategoryList canEdit={canEdit} categories={filteredCategories} />
      )}
    </div>
  );
}
