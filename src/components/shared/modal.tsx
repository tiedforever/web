"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
} from "react";

import { Icon } from "./icons";

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  labelledBy = "modal-title",
  closeDisabled = false,
  returnFocusRef,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  closeDisabled?: boolean;
  returnFocusRef?: { current: HTMLElement | null };
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const returnFocusTarget = returnFocusRef?.current;
    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;
    const focusableSelector =
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

    const focusFirstElement = () => {
      const firstFocusable =
        dialog?.querySelector<HTMLElement>("[data-modal-autofocus]") ??
        dialog?.querySelector<HTMLElement>(focusableSelector);
      (firstFocusable ?? dialog)?.focus();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialog) return;
      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector),
      );
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    requestAnimationFrame(focusFirstElement);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (returnFocusTarget && document.contains(returnFocusTarget)) {
        returnFocusTarget.focus();
      } else if (previousActiveElement && document.contains(previousActiveElement)) {
        previousActiveElement.focus();
      }
    };
  }, [open, returnFocusRef]);

  if (!open) return null;

  return (
    <div
      aria-labelledby={labelledBy}
      aria-describedby={description ? `${labelledBy}-description` : undefined}
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-transparent p-3 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !closeDisabled) onClose();
      }}
      role="dialog"
    >
      <div
        className="modal-surface flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-[18px] border border-[#E4E0D4] bg-white shadow-[0_20px_60px_rgba(28,28,28,0.16)] sm:max-h-[90vh]"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#F0EFEA] px-5 py-5 sm:px-7">
          <div className="min-w-0">
            <h2 className="break-words text-lg font-semibold text-[#1C1C1C]" id={labelledBy}>{title}</h2>
            {description ? <p className="mt-1 break-words text-sm text-[#8A8A82]" id={`${labelledBy}-description`}>{description}</p> : null}
          </div>
          <button
            aria-label="Close dialog"
            className="shrink-0 rounded-lg p-2 text-[#6B6B63] hover:bg-[#F4F4F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A27] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={closeDisabled}
            onClick={onClose}
            type="button"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="min-h-0 min-w-0 overflow-y-auto px-5 py-6 sm:px-7">{children}</div>
      </div>
    </div>
  );
}
