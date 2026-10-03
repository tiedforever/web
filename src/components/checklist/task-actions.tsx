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
import { TaskForm } from "./task-form";
import type {
  ChecklistCategoryOption,
  ChecklistMember,
  TaskMutationAction,
  TaskViewModel,
} from "./types";

type TaskActionsProps = {
  categories: ChecklistCategoryOption[];
  deleteAction: TaskMutationAction;
  members: ChecklistMember[];
  task: TaskViewModel["task"];
  updateAction: TaskViewModel["updateAction"];
};

export function TaskActions({
  categories,
  deleteAction,
  members,
  task,
  updateAction,
}: TaskActionsProps) {
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
        const result = await deleteAction();

        if (!result.success) {
          setError(result.error);
          setDeleteOpen(false);
          return;
        }

        setDeleteOpen(false);
      } catch {
        setError("Unable to delete the task. Please try again.");
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
      <div className="relative shrink-0" ref={menuContainerRef}>
        <button
          aria-controls={`task-actions-menu-${task.id}`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={`Task actions for ${task.title}`}
          className="rounded-md p-1.5 text-[#6B6B63] transition hover:bg-[#F4F4F1] hover:text-[#1C1C1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A27]"
          onClick={() => setMenuOpen((open) => !open)}
          title="Task actions"
          type="button"
          ref={menuTriggerRef}
        >
          <Icon name="more" size={17} />
        </button>
        <div
          className="absolute right-0 top-full z-20 mt-1 min-w-32 rounded-lg border border-[#E8E8E3] bg-white p-1 shadow-[0_8px_24px_rgba(28,28,28,0.12)]"
          hidden={!menuOpen}
          id={`task-actions-menu-${task.id}`}
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
            Edit task
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
            Delete task
          </button>
        </div>
      </div>

      {error ? (
        <p
          aria-live="polite"
          className="absolute right-2 top-full z-10 mt-1 max-w-60 rounded-md border border-[#E7C9C5] bg-[#FFF5F3] px-2 py-1 text-right text-[11px] text-[#9D3F32] shadow-sm"
        >
          {error}
        </p>
      ) : null}

      <Modal
        description="Update the fields available for this checklist task."
        onClose={() => setEditOpen(false)}
        open={editOpen}
        returnFocusRef={menuTriggerRef}
        title={`Edit ${task.title}`}
      >
        <TaskForm
          action={updateAction}
          categories={categories}
          initialValues={{
            assigneeId: task.assigneeId,
            categoryId: task.categoryId,
            description: task.description,
            dueDate: task.dueDate,
            priority: task.priority,
            status: task.status,
            title: task.title,
          }}
          members={members}
          mode="edit"
          onCancel={() => setEditOpen(false)}
          onSuccess={() => {
            setEditOpen(false);
          }}
        />
      </Modal>

      <ConfirmDialog
        confirmLabel="Delete task"
        description={`This will permanently delete “${task.title}”. This cannot be undone.`}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        open={deleteOpen}
        pending={isPending}
        returnFocusRef={menuTriggerRef}
        title={`Delete ${task.title}?`}
      />
    </>
  );
}
