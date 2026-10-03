"use client";

import { Modal } from "./modal";
import { Button } from "./ui";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  pending = false,
  onClose,
  onConfirm,
  returnFocusRef,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  pending?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  returnFocusRef?: { current: HTMLElement | null };
}) {
  return (
    <Modal
      closeDisabled={pending}
      description={description}
      onClose={pending ? () => undefined : onClose}
      open={open}
      returnFocusRef={returnFocusRef}
      title={title}
    >
      <div className="flex justify-end gap-2 border-t border-[#F0EFEA] pt-4">
        <Button disabled={pending} onClick={onClose} type="button" variant="ghost">
          Cancel
        </Button>
        <Button
          className="bg-[#9D3F32] text-white hover:bg-[#84332A]"
          disabled={pending}
          onClick={onConfirm}
          type="button"
          variant="primary"
        >
          {pending ? "Working…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
