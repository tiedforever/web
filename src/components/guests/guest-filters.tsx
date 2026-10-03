"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { FormEvent } from "react";

import type {
  GuestListSection,
  GuestListTag,
} from "@/src/server/repositories/guest-list.repository";
import { Button, Input, Select } from "@/src/components/shared/ui";

export function GuestFilters({
  search,
  ageGroup,
  tagId,
  sectionId,
  sections,
  tags,
}: {
  search?: string;
  ageGroup?: string;
  tagId?: string;
  sectionId?: string;
  sections: GuestListSection[];
  tags: GuestListTag[];
}) {
  const pathname = usePathname();
  const router = useRouter();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    for (const name of ["search", "sectionId", "ageGroup", "tagId"]) {
      const value = formData.get(name);
      if (typeof value === "string" && value.trim()) {
        params.set(name, value.trim());
      }
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <form className="grid gap-3 lg:grid-cols-[minmax(220px,1.5fr)_1fr_1fr_1fr_auto]" method="get" onSubmit={submit}>
      <Input aria-label="Search guests or households" defaultValue={search} name="search" placeholder="Search guests or households…" />
      <Select aria-label="Filter by wedding section" defaultValue={sectionId} name="sectionId">
        <option value="">All sections</option>
        {sections.map((section) => (
          <option key={section.id} value={section.id}>
            {section.name}
          </option>
        ))}
      </Select>
      <Select aria-label="Filter by age group" defaultValue={ageGroup} name="ageGroup">
        <option value="">All age groups</option>
        <option value="ADULT">Adults</option>
        <option value="CHILD">Children</option>
        <option value="INFANT">Infants</option>
      </Select>
      <Select aria-label="Filter by guest tag" defaultValue={tagId} name="tagId">
        <option value="">All tags</option>
        {tags.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.name}
          </option>
        ))}
      </Select>
      <div className="flex items-center gap-2">
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        <Link
          className="text-xs font-medium text-[#6B6B63] hover:text-[#2D5A27]"
          href="/guests"
        >
          Clear
        </Link>
      </div>
    </form>
  );
}
