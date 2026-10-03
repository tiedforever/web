"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { ConfirmDialog } from "../shared/confirm-dialog";
import { Icon } from "../shared/icons";
import { Modal } from "../shared/modal";
import { CreateCategoryForm } from "./create-category-form";
import { CreateTaskForm } from "./create-task-form";
import type {
  CategoryViewModel,
} from "./types";

type CategoryActionsProps = Pick<
  CategoryViewModel,
  | "category"
  | "createTaskAction"
  | "deleteCategoryAction"
  | "members"
  | "updateCategoryAction"
>;

export function CategoryActions({
  category,
  createTaskAction,
  deleteCategoryAction,
  members,
  updateCategoryAction,
}: CategoryActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const frame = requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>("[role=\"menuitem\"]")?.focus();
    });

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        menuContainerRef.current?.contains(event.target)
      ) {
        return;
      }

      setMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [menuOpen]);

  function handleDelete() {
    setError(null);

    startTransition(async () => {
      try {
        const result = await deleteCategoryAction();

        if (!result.success) {
          setError(result.error);
          setDeleteOpen(false);
          return;
        }

        setDeleteOpen(false);
      } catch {
        setError("Unable to delete the category. Please try again.");
        setDeleteOpen(false);
      }
    });
  }

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const menuItems = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>("[role=\"menuitem\"]") ?? [],
    );
    if (menuItems.length === 0) return;

    if (event.key === "Escape") {
      event.preventDefault();
      setMenuOpen(false);
      menuTriggerRef.current?.focus();
      return;
    }

    if (event.key === "Tab") {
      setMenuOpen(false);
      return;
    }

    const currentIndex = menuItems.indexOf(document.activeElement as HTMLElement);
    let nextIndex: number | null = null;

    if (event.key === "ArrowDown") {
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % menuItems.length;
    } else if (event.key === "ArrowUp") {
      nextIndex = currentIndex < 0
        ? menuItems.length - 1
        : (currentIndex - 1 + menuItems.length) % menuItems.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = menuItems.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    menuItems[nextIndex]?.focus();
  }

  return (
    <>
      <div className="absolute right-3 top-2 z-20 flex items-center gap-1" ref={menuContainerRef}>
        <CreateTaskForm action={createTaskAction} compact members={members} />
        <button
          aria-controls={`category-actions-menu-${category.id}`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={`Category actions for ${category.name}`}
          className="rounded-md p-1.5 text-[#6B6B63] transition hover:bg-[#F4F4F1] hover:text-[#1C1C1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A27]"
          onClick={() => setMenuOpen((open) => !open)}
          title="Category actions"
          type="button"
          ref={menuTriggerRef}
        >
          <Icon name="more" size={17} />
        </button>
        <div
          className="absolute right-0 top-full mt-1 min-w-40 rounded-lg border border-[#E8E8E3] bg-white p-1 shadow-[0_8px_24px_rgba(28,28,28,0.12)]"
          hidden={!menuOpen}
          id={`category-actions-menu-${category.id}`}
          onKeyDown={handleMenuKeyDown}
          ref={menuRef}
          role="menu"
        >
          <button
            className="block w-full rounded-md px-3 py-2 text-left text-xs font-medium text-[#6B6B63] hover:bg-[#F4F4F1] hover:text-[#1C1C1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A27]"
            onClick={() => {
              setError(null);
              setMenuOpen(false);
              setEditOpen(true);
            }}
            role="menuitem"
            type="button"
          >
            Edit category
          </button>
          <button
            className="block w-full rounded-md px-3 py-2 text-left text-xs font-medium text-[#9D3F32] hover:bg-[#FFF5F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9D3F32]"
            onClick={() => {
              setError(null);
              setMenuOpen(false);
              setDeleteOpen(true);
            }}
            role="menuitem"
            type="button"
          >
            Delete category
          </button>
        </div>
      </div>

      {error ? (
        <p
          aria-live="polite"
          className="absolute right-3 top-11 z-10 max-w-60 rounded-md border border-[#E7C9C5] bg-[#FFF5F3] px-2 py-1 text-right text-[11px] text-[#9D3F32] shadow-sm"
        >
          {error}
        </p>
      ) : null}

      <Modal
        description="Update this checklist category."
        onClose={() => setEditOpen(false)}
        open={editOpen}
        returnFocusRef={menuTriggerRef}
        title={`Edit ${category.name}`}
      >
        <CreateCategoryForm
          action={updateCategoryAction}
          embedded
          initialValues={{
            colour: category.colour,
            icon: category.icon,
            name: category.name,
          }}
          onSuccess={() => {
            setEditOpen(false);
          }}
          submitLabel="Save changes"
          successMessage="Category updated."
        />
      </Modal>

      <ConfirmDialog
        confirmLabel="Delete category"
        description="Deleting this category will also permanently delete all tasks in it. This cannot be undone."
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        open={deleteOpen}
        pending={isPending}
        returnFocusRef={menuTriggerRef}
        title={`Delete ${category.name}?`}
      />
    </>
  );
}
