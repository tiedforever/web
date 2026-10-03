"use client";

import { CategorySection } from "./category-section";
import type { CategoryViewModel } from "./types";

type CategoryListProps = {
  canEdit: boolean;
  categories: CategoryViewModel[];
};

export function CategoryList({ canEdit, categories }: CategoryListProps) {
  if (categories.length === 0) {
    return (
      <div className="rounded-[14px] border border-dashed border-[#E4E0D4] bg-white px-6 py-12 text-center">
        <h2 className="text-[15px] font-semibold text-[#1C1C1C]">No categories yet</h2>
        <p className="mx-auto mt-2 max-w-md text-[13.5px] text-[#8A8A82]">
          {canEdit
            ? "Add your first category above, then start capturing the tasks that will make the wedding day easier."
            : "Categories will appear here when they are added to this wedding workspace."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {categories.map((categoryViewModel) => (
        <CategorySection
          canEdit={canEdit}
          key={categoryViewModel.category.id}
          {...categoryViewModel}
        />
      ))}
    </div>
  );
}
