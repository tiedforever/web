"use client";

import type { GuestListSection } from "@/src/server/repositories/guest-list.repository";

export function GuestSectionSelector({
  sections,
  selectedSectionIds,
  existingInactiveSections = [],
  onChange,
}: {
  sections: GuestListSection[];
  selectedSectionIds: string[];
  existingInactiveSections?: GuestListSection[];
  onChange: (sectionIds: string[]) => void;
}) {
  const activeSections = sections.filter((section) => section.active);
  const inactiveSections = existingInactiveSections.filter(
    (section) => !section.active && !activeSections.some((active) => active.id === section.id),
  );
  const selectableSections = [...activeSections, ...inactiveSections];
  const existingInactiveIds = inactiveSections.map((section) => section.id);

  function toggle(sectionId: string) {
    onChange(
      selectedSectionIds.includes(sectionId)
        ? selectedSectionIds.filter((id) => id !== sectionId)
        : [...selectedSectionIds, sectionId],
    );
  }

  return (
    <fieldset>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <legend className="text-xs font-medium text-[#6B6B63]">Wedding sections</legend>
        {selectableSections.length > 0 ? (
          <div className="flex items-center gap-3 text-xs font-semibold">
            <button
              className="text-[#2D5A27] hover:underline"
              onClick={() => onChange(Array.from(new Set([...activeSections.map((section) => section.id), ...existingInactiveIds])))}
              type="button"
            >
              Select all
            </button>
            <button
              className="text-[#6B6B63] hover:text-[#2D5A27] hover:underline"
              onClick={() => onChange([])}
              type="button"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>
      {selectableSections.length > 0 ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {selectableSections.map((section) => {
            const selected = selectedSectionIds.includes(section.id);
            return (
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-sm ${selected ? "border-[#2D5A27] bg-[#F7FBF5]" : "border-[#E8E8E3] bg-white"}`}
                key={section.id}
              >
                <input
                  checked={selected}
                  className="mt-0.5 accent-[#2D5A27]"
                  onChange={() => toggle(section.id)}
                  type="checkbox"
                />
                <span>
                  <span className="block font-medium text-[#1C1C1C]">{section.name}</span>
                  {!section.active ? (
                    <span className="mt-0.5 block text-xs text-[#8A8A82]">Inactive · existing assignment</span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-xs text-[#8A8A82]">No active wedding sections are available yet.</p>
      )}
      <p className="mt-2 text-xs leading-5 text-[#8A8A82]">
        A guest can have no sections, one section, or several sections.
      </p>
    </fieldset>
  );
}
