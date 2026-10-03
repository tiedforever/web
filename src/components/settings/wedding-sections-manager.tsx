"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  createWeddingSection,
  deleteWeddingSection,
  initializeWeddingSections,
  reorderWeddingSections,
  setWeddingSectionActive,
  updateWeddingSection,
  type WeddingSectionActionResult,
} from "@/src/server/actions/settings/wedding-section.actions";
import { ConfirmDialog } from "@/src/components/shared/confirm-dialog";
import { Badge, Button, Card, Input } from "@/src/components/shared/ui";
import type { WeddingSectionData } from "@/src/server/repositories/wedding-section.repository";
import { invalidateGuestsQuery } from "@/src/components/guests/guest-query-cache";

const MAX_SECTION_NAME_LENGTH = 100;
const MAX_SECTION_DESCRIPTION_LENGTH = 500;

export function WeddingSectionsManager({
  initialSections,
  readOnly = false,
  weddingId,
}: {
  initialSections: WeddingSectionData[];
  readOnly?: boolean;
  weddingId: string;
}) {
  const queryClient = useQueryClient();
  const [sections, setSections] = useState(initialSections);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function applyResult<T>(
    result: WeddingSectionActionResult<T>,
    onSuccess: (data: T) => void,
  ) {
    setError(null);
    setMessage(null);

    if (!result.success) {
      setError(result.error);
      return false;
    }

    onSuccess(result.data);
    void invalidateGuestsQuery(queryClient, weddingId);
    return true;
  }

  function createSection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) return;

    startTransition(async () => {
      try {
        const result = await createWeddingSection({
          name: newName,
          description: newDescription,
        });

        if (
          applyResult(result, (data) => {
            setSections(data);
            setNewName("");
            setNewDescription("");
          })
        ) {
          setMessage("Wedding day section added.");
        }
      } catch {
        setError("Unable to save wedding day sections. Please try again.");
      }
    });
  }

  function initializeSections() {
    if (readOnly) return;

    startTransition(async () => {
      try {
        const result = await initializeWeddingSections();
        if (applyResult(result, (data) => setSections(data))) {
          setMessage("Default wedding day sections added.");
        }
      } catch {
        setError("Unable to save wedding day sections. Please try again.");
      }
    });
  }

  function saveSection(sectionId: string) {
    if (readOnly) return;

    const section = sections.find((candidate) => candidate.id === sectionId);
    if (!section) return;

    startTransition(async () => {
      try {
        const result = await updateWeddingSection(sectionId, {
          name: section.name,
          description: section.description,
        });

        if (applyResult(result, (data) => setSections(data))) {
          setMessage("Wedding day section saved.");
        }
      } catch {
        setError("Unable to save wedding day sections. Please try again.");
      }
    });
  }

  function changeActive(sectionId: string, active: boolean) {
    if (readOnly) return;

    startTransition(async () => {
      try {
        const result = await setWeddingSectionActive(sectionId, active);
        if (applyResult(result, (data) => setSections(data))) {
          setMessage(active ? "Section activated." : "Section deactivated.");
        }
      } catch {
        setError("Unable to save wedding day sections. Please try again.");
      }
    });
  }

  function moveSection(sectionId: string, direction: -1 | 1) {
    if (readOnly) return;

    const currentIndex = sections.findIndex((section) => section.id === sectionId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= sections.length) return;

    const nextSections = [...sections];
    const [section] = nextSections.splice(currentIndex, 1);
    nextSections.splice(nextIndex, 0, section);

    startTransition(async () => {
      try {
        const result = await reorderWeddingSections(
          nextSections.map((candidate) => candidate.id),
        );
        if (applyResult(result, (data) => setSections(data))) {
          setMessage("Wedding day section order saved.");
        }
      } catch {
        setError("Unable to save wedding day section order. Please try again.");
      }
    });
  }

  function deleteSection() {
    if (readOnly || !deleteId) return;

    const sectionId = deleteId;
    startTransition(async () => {
      try {
        const result = await deleteWeddingSection(sectionId);
        const succeeded = applyResult(result, (data) => setSections(data));
        if (succeeded) {
          setDeleteId(null);
          setMessage("Wedding day section deleted.");
        } else {
          setDeleteId(null);
        }
      } catch {
        setDeleteId(null);
        setError("Unable to delete the wedding day section. Please try again.");
      }
    });
  }

  function updateSectionField(
    sectionId: string,
    field: "name" | "description",
    value: string,
  ) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? { ...section, [field]: field === "description" ? value || null : value }
          : section,
      ),
    );
    setError(null);
    setMessage(null);
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#1C1C1C]">Manage sections</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#7A7A6E]">
              Sections are fully customizable. Inactive sections stay saved but are not
              available for future guest invitation assignment.
            </p>
          </div>
          {readOnly ? <Badge>Read only</Badge> : <Badge tone="success">Owner or editor</Badge>}
        </div>
      </Card>

      {!readOnly ? (
        <Card className="p-5 sm:p-6">
          <form className="space-y-4" onSubmit={createSection}>
            <div>
              <h2 className="text-base font-semibold text-[#1C1C1C]">Add a section</h2>
              <p className="mt-1 text-sm leading-6 text-[#7A7A6E]">
                New sections are appended after the current sections.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">
                <span>Name</span>
                <Input
                  disabled={isPending}
                  maxLength={MAX_SECTION_NAME_LENGTH}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="For example, Evening reception"
                  required
                  value={newName}
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">
                <span>Description <span className="font-normal text-[#8A8A82]">(optional)</span></span>
                <Input
                  disabled={isPending}
                  maxLength={MAX_SECTION_DESCRIPTION_LENGTH}
                  onChange={(event) => setNewDescription(event.target.value)}
                  placeholder="A short note about this part of the day"
                  value={newDescription}
                />
              </label>
            </div>
            <div className="flex justify-end border-t border-[#F0EFEA] pt-4">
              <Button disabled={isPending} type="submit" variant="primary">
                {isPending ? "Adding…" : "Add section"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {error ? (
        <p aria-live="polite" className="rounded-lg bg-[#FFF5F3] px-3 py-2 text-sm text-[#9D3F32]">
          {error}
        </p>
      ) : null}
      {message ? (
        <p aria-live="polite" className="rounded-lg bg-[#EAF0E8] px-3 py-2 text-sm text-[#2D5A27]">
          {message}
        </p>
      ) : null}

      {sections.length === 0 ? (
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-semibold text-[#1C1C1C]">No sections yet</h2>
          <p className="mt-1 text-sm leading-6 text-[#7A7A6E]">
            {readOnly
              ? "An owner or editor can add the first wedding day section."
              : "Use the initial Ceremony and Venue sections, or add your own section below."}
          </p>
          {!readOnly ? (
            <div className="mt-4">
              <Button
                disabled={isPending}
                onClick={initializeSections}
                type="button"
                variant="outline"
              >
                {isPending ? "Initializing…" : "Initialize default sections"}
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}

      <div className="space-y-3">
        {sections.map((section, index) => (
          <Card className="p-5 sm:p-6" key={section.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-1 flex h-7 min-w-7 items-center justify-center rounded-full bg-[#F4F4F1] px-2 text-xs font-semibold text-[#6B6B63]">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {readOnly ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-[#1C1C1C]">{section.name}</h3>
                        <StatusBadge active={section.active} />
                      </div>
                      <p className="mt-1 text-sm leading-6 text-[#7A7A6E]">
                        {section.description || "No description added."}
                      </p>
                    </>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">
                        <span>Name</span>
                        <Input
                          disabled={isPending}
                          maxLength={MAX_SECTION_NAME_LENGTH}
                          onChange={(event) => updateSectionField(section.id, "name", event.target.value)}
                          required
                          value={section.name}
                        />
                      </label>
                      <label className="grid gap-1.5 text-xs font-medium text-[#6B6B63]">
                        <span>Description <span className="font-normal text-[#8A8A82]">(optional)</span></span>
                        <textarea
                          className="min-h-10 rounded-[10px] border border-[#E8E8E3] bg-white px-3 py-2 text-[13.5px] text-[#1C1C1C] outline-none placeholder:text-[#8A8A82] focus:border-[#2D5A27] focus:ring-2 focus:ring-[#EAF0E8]"
                          disabled={isPending}
                          maxLength={MAX_SECTION_DESCRIPTION_LENGTH}
                          onChange={(event) => updateSectionField(section.id, "description", event.target.value)}
                          placeholder="Optional description"
                          value={section.description ?? ""}
                        />
                      </label>
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <StatusBadge active={section.active} />
                        <Button
                          disabled={isPending}
                          onClick={() => saveSection(section.id)}
                          type="button"
                          variant="outline"
                        >
                          Save changes
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {!readOnly ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                  <Button
                    aria-label={`Move ${section.name} up`}
                    disabled={isPending || index === 0}
                    onClick={() => moveSection(section.id, -1)}
                    type="button"
                    variant="ghost"
                  >
                    ↑
                  </Button>
                  <Button
                    aria-label={`Move ${section.name} down`}
                    disabled={isPending || index === sections.length - 1}
                    onClick={() => moveSection(section.id, 1)}
                    type="button"
                    variant="ghost"
                  >
                    ↓
                  </Button>
                  <Button
                    disabled={isPending}
                    onClick={() => changeActive(section.id, !section.active)}
                    type="button"
                    variant="secondary"
                  >
                    {section.active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    className="text-[#9D3F32] hover:bg-[#FFF5F3]"
                    disabled={isPending}
                    onClick={() => setDeleteId(section.id)}
                    type="button"
                    variant="ghost"
                  >
                    Delete
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        confirmLabel="Delete section"
        description="A section with guest assignments cannot be deleted. Deactivate it or remove guest assignments first. This cannot be undone."
        onClose={() => setDeleteId(null)}
        onConfirm={deleteSection}
        open={deleteId !== null}
        pending={isPending}
        title="Delete wedding day section?"
      />
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? "success" : "warning"}>{active ? "Active" : "Inactive"}</Badge>;
}
