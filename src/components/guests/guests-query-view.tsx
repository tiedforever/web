"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { guestsQueryOptions } from "@/src/client/query-options";
import { GuestCreationTrigger } from "@/src/components/guests/guest-creation-trigger";
import { GuestFilters } from "@/src/components/guests/guest-filters";
import { GuestsLoadingSkeleton } from "@/src/components/guests/guests-loading-skeleton";
import { GuestTagManager } from "@/src/components/guests/guest-tag-manager";
import { GuestTable } from "@/src/components/guests/guest-table";
import { useDelayedLoadingVisible } from "@/src/components/shared/delayed-loading";
import { Icon } from "@/src/components/shared/icons";
import { shouldShowQuerySkeleton } from "@/src/components/shared/loading-skeleton";
import { PageHeader } from "@/src/components/shared/page-header";
import { Badge, Card } from "@/src/components/shared/ui";
import type { GuestQueryFilters } from "@/src/types/guests";

type GuestsQueryViewProps = {
  canEdit: boolean;
  filters: GuestQueryFilters;
  partnerNames: string;
  weddingId: string;
};

export function GuestsQueryView({
  canEdit,
  filters,
  partnerNames,
  weddingId,
}: GuestsQueryViewProps) {
  const query = useQuery(guestsQueryOptions(weddingId, filters));
  const data = query.data;
  const routeLoadingVisible = useDelayedLoadingVisible();
  const showSkeleton = shouldShowQuerySkeleton({
    hasData: data !== undefined,
    isPending: query.isPending,
    routeLoadingVisible,
  });

  if (!data) {
    if (query.isError) {
      return <GuestsError onRetry={() => void query.refetch()} />;
    }
    if (showSkeleton) {
      return <GuestsLoadingSkeleton />;
    }
    return null;
  }

  const { guestList, sections } = data;
  const { standaloneGuests, households, tags } = guestList;
  const hasActiveFilters = Boolean(
    filters.search || filters.ageGroup || filters.tagId || filters.sectionId,
  );
  const activeSections = sections.filter((section) => section.active);
  const householdGuests = households.flatMap((household) => household.guests);
  const allGuests = [...standaloneGuests, ...householdGuests];
  const totalGuestCount = allGuests.length;
  const withoutHouseholdCount = standaloneGuests.length;
  const childCount = allGuests.filter((guest) => guest.ageGroup === "CHILD").length;
  const infantCount = allGuests.filter((guest) => guest.ageGroup === "INFANT").length;

  return (
    <div className="space-y-8">
      <PageHeader
        description="Keep people, households, and guest details together as plans take shape."
        eyebrow={partnerNames}
        title="Guest list"
        actions={
          <>
            <Link
              className="inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-[#E8E8E3] bg-[#F4F4F1] px-4 py-2 text-[13px] font-medium text-[#1C1C1C] hover:bg-[#EAEAE7]"
              href="/guests/households"
            >
              <Icon name="users" size={15} />
              Households
            </Link>
            {canEdit ? (
              <GuestCreationTrigger
                households={households}
                sections={activeSections}
                tags={tags}
                weddingId={weddingId}
              />
            ) : null}
          </>
        }
      />

      {query.isError ? (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-[#E7C9C5] bg-[#FFF5F3] px-4 py-3 text-sm text-[#5C211B]">
          <span>Live guest refresh failed. Showing the last available data.</span>
          <button
            className="shrink-0 font-semibold underline underline-offset-2"
            onClick={() => void query.refetch()}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total guests" value={totalGuestCount} icon="users" />
        <SummaryCard label="Households" value={households.length} icon="users" />
        <SummaryCard label="No household" value={withoutHouseholdCount} icon="pin" />
        <SummaryCard label="Children & infants" value={childCount + infantCount} icon="heart" />
      </section>

      <Card className="p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Icon name="search" size={16} />
          <h2 className="text-sm font-semibold text-[#1C1C1C]">Find a guest</h2>
        </div>
        <GuestFilters
          ageGroup={filters.ageGroup || undefined}
          key={`${filters.search}-${filters.sectionId}-${filters.ageGroup}-${filters.tagId}`}
          search={filters.search || undefined}
          sectionId={filters.sectionId || undefined}
          sections={activeSections}
          tagId={filters.tagId || undefined}
          tags={tags}
        />
        <div className="mt-4 border-t border-[#F0EFEA] pt-4">
          <GuestTagManager canEdit={canEdit} tags={tags} weddingId={weddingId} />
        </div>
      </Card>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1C1C1C]">Guest list</h2>
          <p className="mt-1 text-sm text-[#8A8A82]">
            {households.length} {households.length === 1 ? "household" : "households"} and {standaloneGuests.length} standalone {standaloneGuests.length === 1 ? "guest" : "guests"} matching the current view.
          </p>
        </div>
        {tags.length > 0 ? <Badge tone="success">{tags.length} wedding tags</Badge> : null}
      </div>

      <GuestTable
        canEdit={canEdit}
        hasActiveFilters={hasActiveFilters}
        households={households}
        key={`${filters.search}-${filters.sectionId}-${filters.ageGroup}-${filters.tagId}`}
        search={filters.search}
        standaloneGuests={standaloneGuests}
        weddingId={weddingId}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: "users" | "pin" | "heart";
}) {
  return (
    <Card className="flex items-center justify-between gap-4 p-5">
      <div>
        <p className="text-xs text-[#8A8A82]">{label}</p>
        <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#1C1C1C]">{value}</p>
      </div>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F4F4F1] text-[#6B6B63]">
        <Icon name={icon} size={20} />
      </span>
    </Card>
  );
}

function GuestsError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="border-[#E7C9C5] bg-[#FFF5F3] p-6 text-[#5C211B]">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-red-700">
        Guest list unavailable
      </p>
      <h1 className="mt-2 text-2xl font-semibold">We could not load your guests</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-red-900">
        Unable to load guest data right now. Please try again.
      </p>
      <button
        className="mt-4 rounded-lg bg-[#2D5A27] px-3 py-2 text-sm font-semibold text-white"
        onClick={onRetry}
        type="button"
      >
        Try again
      </button>
    </Card>
  );
}
