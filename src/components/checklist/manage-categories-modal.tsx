"use client";

import { useState } from "react";

import { Modal } from "../shared/modal";
import { Button } from "../shared/ui";
import { CreateCategoryForm } from "./create-category-form";
import type { CreateCategoryAction } from "./types";

export function ManageCategoriesModal({
  action,
}: {
  action: CreateCategoryAction;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} type="button" variant="primary">
        Manage categories
      </Button>
      <Modal
        description="Add a category to organise your wedding planning tasks."
        onClose={() => setOpen(false)}
        open={open}
        title="Add Category"
      >
        <CreateCategoryForm
          action={action}
          embedded
          onSuccess={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
