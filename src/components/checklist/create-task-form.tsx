"use client";

import { useState } from "react";

import { Icon } from "../shared/icons";
import { Modal } from "../shared/modal";
import { TaskForm } from "./task-form";
import type { ChecklistMember, CreateTaskAction } from "./types";

type CreateTaskFormProps = {
  action: CreateTaskAction;
  compact?: boolean;
  members: ChecklistMember[];
};

export function CreateTaskForm({
  action,
  compact = false,
  members,
}: CreateTaskFormProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className={compact ? "" : "mt-4 border-t border-dashed border-[#E4E0D4] px-2 pt-4"}>
        <button
          className="inline-flex items-center gap-2 rounded-[10px] border border-[#E8E8E3] bg-white px-3.5 py-2 text-sm font-medium text-[#2D5A27] transition hover:border-[#2D5A27] hover:bg-[#F7FAF6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A27] focus-visible:ring-offset-2"
          onClick={() => setIsOpen(true)}
          type="button"
        >
          <Icon name="plus" size={16} />
          Add task
        </button>
      </div>

      <Modal
        description="Add a task to this checklist category."
        onClose={() => setIsOpen(false)}
        open={isOpen}
        title="Add task"
      >
        <TaskForm
          action={action}
          members={members}
          mode="create"
          onCancel={() => setIsOpen(false)}
          onSuccess={() => setIsOpen(false)}
        />
      </Modal>
    </>
  );
}
