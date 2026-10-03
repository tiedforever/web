"use client";

import Link from "next/link";
import { Fragment, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { removePlusOneRelationship } from "@/src/server/actions/guests/guest.actions";
import type {
  GuestListHousehold,
  GuestListHouseholdGuest,
  GuestListPlusOne,
  GuestListStandaloneGuest,
} from "@/src/server/repositories/guest-list.repository";
import { Icon } from "@/src/components/shared/icons";
import { ConfirmDialog } from "@/src/components/shared/confirm-dialog";
import { Badge, Card, EmptyState } from "@/src/components/shared/ui";
import { invalidateGuestsQuery } from "./guest-query-cache";

type GuestRowData = GuestListStandaloneGuest | GuestListPlusOne;

export function GuestTable({
  canEdit,
  hasActiveFilters = false,
  households,
  standaloneGuests,
  search = "",
  weddingId,
}: {
  canEdit: boolean;
  hasActiveFilters?: boolean;
  households: GuestListHousehold[];
  standaloneGuests: GuestListStandaloneGuest[];
  search?: string;
  weddingId: string;
}) {
  const [expandedHouseholds, setExpandedHouseholds] = useState<Set<string>>(
    () => (search.trim() ? new Set(households.map((household) => household.id)) : new Set()),
  );
  const standaloneGroups = groupGuests(standaloneGuests);

  if (households.length === 0 && standaloneGroups.length === 0) {
    return (
      <Card className="px-6 py-16">
        <EmptyState
          description={hasActiveFilters
            ? "Try adjusting your search or filters."
            : "Add the first guest or household to this wedding."}
          icon={<Icon name="users" size={22} />}
          title={hasActiveFilters ? "No matching invitation units" : "No invitation units found"}
        />
      </Card>
    );
  }

  function toggleHousehold(householdId: string) {
    setExpandedHouseholds((current) => {
      const next = new Set(current);
      if (next.has(householdId)) next.delete(householdId);
      else next.add(householdId);
      return next;
    });
  }

  return (
    <Card className="overflow-hidden">
      <div className="divide-y divide-[#F0EFEA]">
        {households.map((household) => (
          <HouseholdItem
            canEdit={canEdit}
            expanded={expandedHouseholds.has(household.id)}
            household={household}
            key={household.id}
            onToggle={() => toggleHousehold(household.id)}
            search={search}
            weddingId={weddingId}
          />
        ))}

        {standaloneGroups.map(({ guest, plusOnes }) => (
          <div className="border-b border-[#F0EFEA] px-0 last:border-b-0" key={guest.id}>
            <StandaloneGuestRow canEdit={canEdit} guest={guest} search={search} weddingId={weddingId} />
            {plusOnes.length > 0 ? (
              <div className="pb-4">
                {plusOnes.map((plusOne) => (
                  <StandaloneGuestRow
                    guest={plusOne}
                    key={plusOne.id}
                    nested
                    relationshipLabel={`Plus-one of ${guest.firstName} ${guest.lastName}`}
                    canEdit={canEdit}
                    search={search}
                    weddingId={weddingId}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}

function HouseholdItem({
  canEdit,
  household,
  expanded,
  onToggle,
  search,
  weddingId,
}: {
  canEdit: boolean;
  household: GuestListHousehold;
  expanded: boolean;
  onToggle: () => void;
  search: string;
  weddingId: string;
}) {
  const aggregateTags = Array.from(
    new Map(
      household.guests
        .flatMap((guest) => guest.tags)
        .map((tag) => [tag.id, tag]),
    ).values(),
  );

  return (
    <section>
      <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
        <button
          aria-controls={`household-members-${household.id}`}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${household.name}`}
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#6B6B63] hover:bg-[#F4F4F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A27]"
          onClick={onToggle}
          type="button"
        >
          <span className={expanded ? "rotate-90 transition-transform" : "transition-transform"}>
            <Icon name="chevron-right" size={18} />
          </span>
        </button>
        <button
          aria-controls={`household-members-${household.id}`}
          aria-expanded={expanded}
          className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A27] focus-visible:ring-offset-2"
          onClick={onToggle}
          type="button"
        >
          <span className="block break-words text-sm font-semibold text-[#1C1C1C]">{household.name}</span>
          <span className="mt-1 block break-words text-xs text-[#8A8A82]">
            {household.guests.length} {household.guests.length === 1 ? "member" : "members"}
            {household.primaryGuest ? ` · Primary: ${household.primaryGuest.firstName} ${household.primaryGuest.lastName}` : ""}
            {` · ${household.addressLineOne}, ${household.townCity}`}
          </span>
          {aggregateTags.length > 0 ? (
            <span className="mt-2 flex flex-wrap gap-1.5">
              {aggregateTags.slice(0, 4).map((tag) => <Badge key={tag.id} tone="success">{tag.name}</Badge>)}
              {aggregateTags.length > 4 ? <Badge>+{aggregateTags.length - 4}</Badge> : null}
            </span>
          ) : null}
        </button>
        <Link
          className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#2D5A27] hover:bg-[#EAF0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A27]"
          href={`/guests/households/${household.id}`}
        >
          View household
        </Link>
      </div>

      {expanded ? (
        <div className="border-t border-[#DDEBD9] bg-[#F7FBF5] px-4 py-4 sm:px-5" id={`household-members-${household.id}`}>
          <div
            aria-label={`${household.name} members`}
            className="ml-10 border-l-2 border-[#C9DCC5] pl-4 sm:ml-12 sm:pl-5"
            role="region"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4A7C57]">Household members</p>
                <p className="mt-1 text-xs text-[#8A8A82]">Each person remains a separate guest record.</p>
              </div>
              <Badge tone="success">{household.guests.length}</Badge>
            </div>
            <div className="overflow-hidden rounded-xl border border-[#DDEBD9] bg-white shadow-[0_1px_2px_rgba(45,90,39,0.04)]">
              {household.guests.length > 0 ? groupHouseholdGuests(household.guests).map(({ guest, plusOnes }) => (
                <Fragment key={guest.id}>
                  <HouseholdMemberRow
                    canEdit={canEdit}
                    guest={guest}
                    isPrimary={guest.id === household.primaryGuestId}
                    search={search}
                    weddingId={weddingId}
                  />
                  {plusOnes.map((plusOne) => (
                    <HouseholdMemberRow
                      canEdit={canEdit}
                      guest={plusOne}
                      isPrimary={plusOne.id === household.primaryGuestId}
                      key={plusOne.id}
                      nested
                      relationshipLabel={`Plus-one of ${guest.firstName} ${guest.lastName}`}
                      search={search}
                      weddingId={weddingId}
                    />
                  ))}
                </Fragment>
              )) : (
                <p className="px-4 py-5 text-sm text-[#8A8A82]">This household has no assigned guests.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function HouseholdMemberRow({
  canEdit,
  guest,
  isPrimary,
  nested = false,
  relationshipLabel,
  search,
  weddingId,
}: {
  canEdit: boolean;
  guest: GuestListHouseholdGuest;
  isPrimary: boolean;
  nested?: boolean;
  relationshipLabel?: string;
  search: string;
  weddingId: string;
}) {
  const highlighted = search.length > 0 && memberMatchesSearch(guest, search);
  const relationshipText = relationshipLabel ?? (guest.plusOneFor
    ? `Plus-one of ${guest.plusOneFor.firstName} ${guest.plusOneFor.lastName}`
    : null);

  return (
    <div className={`flex items-start gap-3 px-4 py-4 hover:bg-[#FCFCFA] ${nested ? "my-2 ml-5 mr-3 rounded-lg border border-[#DDEBD9] bg-[#F7FBF5] px-3 py-3 sm:ml-8 sm:mr-4 sm:px-4" : "border-b border-[#F0EFEA] last:border-b-0"} ${highlighted ? "bg-[#F2F8F0]" : ""}`}>
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF0E8] text-[11px] font-semibold text-[#2D5A27]">
        {guest.firstName.charAt(0)}{guest.lastName.charAt(0)}
      </span>
      <div className="min-w-0 flex-1">
        <Link className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A27] focus-visible:ring-offset-2" href={`/guests/${guest.id}`}>
          <span className="block text-sm font-medium text-[#1C1C1C] hover:text-[#2D5A27]">
            {[guest.title, guest.firstName, guest.lastName].filter(Boolean).join(" ")}
          </span>
          <span className="mt-1 block break-words text-xs text-[#8A8A82]">
            {relationshipText ?? (isPrimary ? "Primary invitee" : "Household member")}
            {guest.email ? ` · ${guest.email}` : ""}
            {guest.phone ? ` · ${guest.phone}` : ""}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
          {nested ? <Badge tone="success">Plus-one</Badge> : null}
            {isPrimary ? <Badge tone="success">Primary</Badge> : null}
            <Badge tone={guest.ageGroup === "ADULT" ? "default" : "gold"}>{formatAgeGroup(guest.ageGroup)}</Badge>
            {guest.tags.map((tag) => <Badge key={tag.id} tone="success">{tag.name}</Badge>)}
          </span>
          <SectionSummary sections={guest.sections} />
        </Link>
        {nested && canEdit ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold">
            <RemovePlusOneButton guestId={guest.id} guestName={`${guest.firstName} ${guest.lastName}`} weddingId={weddingId} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StandaloneGuestRow({
  canEdit,
  guest,
  nested = false,
  relationshipLabel,
  search,
  weddingId,
}: {
  canEdit: boolean;
  guest: GuestRowData;
  nested?: boolean;
  relationshipLabel?: string;
  search: string;
  weddingId: string;
}) {
  const relationshipText = relationshipLabel ?? (
    guest.plusOneFor
      ? `Plus-one of ${guest.plusOneFor.firstName} ${guest.plusOneFor.lastName}`
      : null
  );
  const highlighted = search.length > 0 && guestMatchesSearch(guest, search);

  return (
    <div className={`flex items-start gap-3 px-4 py-4 sm:px-5 ${nested ? "ml-8 mr-4 rounded-lg border border-[#DDEBD9] bg-[#F7FBF5] px-3 py-3 sm:ml-14 sm:mr-5 sm:px-4" : ""} ${highlighted ? "bg-[#F2F8F0]" : ""}`}>
      <span className={`${nested ? "h-8 w-8 text-[11px]" : "h-9 w-9 text-xs"} flex shrink-0 items-center justify-center rounded-full bg-[#EAF0E8] font-semibold text-[#2D5A27]`}>
        {guest.firstName.charAt(0)}{guest.lastName.charAt(0)}
      </span>
      <div className="min-w-0 flex-1">
        <Link className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A27] focus-visible:ring-offset-2" href={`/guests/${guest.id}`}>
          <span className="block text-sm font-medium text-[#1C1C1C] hover:text-[#2D5A27]">
            {[guest.title, guest.firstName, guest.lastName].filter(Boolean).join(" ")}
          </span>
          {relationshipText ? <span className="mt-1 block text-xs text-[#8A8A82]">{relationshipText}</span> : null}
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
          {nested ? <Badge tone="success">Plus-one</Badge> : null}
            <Badge tone={guest.ageGroup === "ADULT" ? "default" : "gold"}>{formatAgeGroup(guest.ageGroup)}</Badge>
            {guest.tags.map((tag) => <Badge key={tag.id} tone="success">{tag.name}</Badge>)}
          </span>
          <SectionSummary sections={guest.sections} />
        </Link>
        {nested && canEdit ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold">
            <RemovePlusOneButton guestId={guest.id} guestName={`${guest.firstName} ${guest.lastName}`} weddingId={weddingId} />
          </div>
        ) : null}
      </div>
      <span className="hidden min-w-0 max-w-[45%] break-words text-right text-xs leading-5 text-[#6B6B63] sm:block">
        {guest.email ? <span className="block">{guest.email}</span> : null}
        {guest.phone ? <span className="block">{guest.phone}</span> : null}
        {!guest.email && !guest.phone ? <span className="text-[#A5A39A]">No contact details</span> : null}
      </span>
    </div>
  );
}

function SectionSummary({
  sections,
}: {
  sections: { id: string; name: string; active: boolean }[];
}) {
  return (
    <span className="mt-2 block break-words text-xs text-[#6B6B63]">
      <span className="font-medium text-[#8A8A82]">Sections:</span>{" "}
      {sections.length > 0
        ? sections.map((section) => `${section.name}${section.active ? "" : " (inactive)"}`).join(", ")
        : "—"}
    </span>
  );
}

function groupHouseholdGuests(guests: GuestListHouseholdGuest[]) {
  const guestById = new Map(guests.map((guest) => [guest.id, guest]));
  const groupedIds = new Set<string>();
  const groups = guests
    .filter((guest) => !guest.plusOneFor)
    .map((guest) => {
      const plusOnes = guest.plusOnes
        .map((plusOne) => guestById.get(plusOne.id))
        .filter((plusOne): plusOne is GuestListHouseholdGuest => Boolean(plusOne));
      plusOnes.forEach((plusOne) => groupedIds.add(plusOne.id));
      return { guest, plusOnes };
    });

  guests
    .filter((guest) => guest.plusOneFor && !groupedIds.has(guest.id))
    .forEach((guest) => groups.push({ guest, plusOnes: [] }));

  return groups;
}

function groupGuests(guests: GuestListStandaloneGuest[]) {
  return guests
    .filter((guest) => !guest.plusOneFor)
    .map((guest) => ({ guest, plusOnes: guest.plusOnes }));
}

function RemovePlusOneButton({
  guestId,
  guestName,
  weddingId,
}: {
  guestId: string;
  guestName: string;
  weddingId: string;
}) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  function remove() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await removePlusOneRelationship(guestId);
        if (!result.success) {
          setIsConfirmOpen(false);
          setError(result.error);
          return;
        }
        setIsConfirmOpen(false);
        void invalidateGuestsQuery(queryClient, weddingId);
      } catch {
        setIsConfirmOpen(false);
        setError("Unable to remove the plus-one relationship. Please try again.");
      }
    });
  }

  return (
    <>
      <span className="inline-flex flex-wrap items-center gap-2">
      <button
        className="text-[#9D3F32] hover:underline disabled:cursor-wait disabled:opacity-60"
        disabled={isPending}
        onClick={() => setIsConfirmOpen(true)}
        type="button"
      >
        {isPending ? "Removing…" : "Remove relationship"}
      </button>
      {error ? <span className="font-normal text-[#9D3F32]">{error}</span> : null}
      </span>
      <ConfirmDialog
        confirmLabel="Remove relationship"
        description={`${guestName} will remain in the wedding as a standalone guest.`}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={remove}
        open={isConfirmOpen}
        pending={isPending}
        title="Remove plus-one relationship?"
      />
    </>
  );
}

function memberMatchesSearch(guest: GuestListHouseholdGuest, search: string) {
  const normalized = search.toLowerCase();
  return [
    guest.firstName,
    guest.lastName,
    guest.email,
    guest.phone,
    guest.plusOneFor?.firstName,
    guest.plusOneFor?.lastName,
  ].some((value) => value?.toLowerCase().includes(normalized));
}

function guestMatchesSearch(guest: GuestRowData, search: string) {
  const normalized = search.toLowerCase();
  return [
    guest.firstName,
    guest.lastName,
    guest.email,
    guest.phone,
    guest.plusOneFor?.firstName,
    guest.plusOneFor?.lastName,
  ].some((value) => value?.toLowerCase().includes(normalized));
}

function formatAgeGroup(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
