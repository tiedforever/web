import { PageHeader } from "../shared/page-header";
import { ManageCategoriesModal } from "./manage-categories-modal";
import type { CreateCategoryAction } from "./types";

type ChecklistPageHeaderProps = {
  weddingName: string;
  weddingDate: string;
  canEdit: boolean;
  createCategoryAction: CreateCategoryAction;
};

export function ChecklistPageHeader({
  weddingName,
  weddingDate,
  canEdit,
  createCategoryAction,
}: ChecklistPageHeaderProps) {
  return (
    <PageHeader
      description={`Wedding date: ${weddingDate}`}
      eyebrow={weddingName}
      title="Wedding Checklist"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <ManageCategoriesModal action={createCategoryAction} />
          ) : null}
        </div>
      }
    />
  );
}
