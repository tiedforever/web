import Link from "next/link";

import { GuestForm } from "@/src/components/guests/guest-form";
import { WeddingRequiredState } from "@/src/components/shared/wedding-required-state";
import { getGuestTags } from "@/src/server/actions/guests/guest-tag.actions";
import { getWeddingSections } from "@/src/server/actions/settings/wedding-section.actions";
import { getGuest, getGuests } from "@/src/server/actions/guests/guest.actions";
import { getHouseholds } from "@/src/server/actions/guests/household.actions";
import { getWeddingPageContext } from "@/src/server/auth/get-wedding-page-context";
import { Icon } from "@/src/components/shared/icons";
import { Breadcrumbs } from "@/src/components/shared/breadcrumbs";
import { PageHeader } from "@/src/components/shared/page-header";
import { Badge, Card } from "@/src/components/shared/ui";
import { NO_INDEX_ROBOTS } from "@/src/seo/site-metadata";

export const metadata = {
  title: "Guest details",
  robots: NO_INDEX_ROBOTS,
};

export const dynamic = "force-dynamic";

export default async function GuestDetailPage({
  params,
}: {
  params: Promise<{ guestId: string }>;
}) {
  const context = await getWeddingPageContext();

  if (!context) {
    return <WeddingRequiredState feature="Guest details" />;
  }
  const { guestId } = await params;
  const guestResult = await getGuest(guestId);
  const householdsResult = await getHouseholds();
  const tagsResult = await getGuestTags();
  const guestsResult = await getGuests();
  const sectionsResult = await getWeddingSections();

  if (!guestResult.success) {
    return <GuestDetailError message={guestResult.error} />;
  }
  if (!householdsResult.success) {
    return <GuestDetailError message={householdsResult.error} />;
  }
  if (!tagsResult.success) {
    return <GuestDetailError message={tagsResult.error} />;
  }
  if (!guestsResult.success) {
    return <GuestDetailError message={guestsResult.error} />;
  }
  if (!sectionsResult.success) {
    return <GuestDetailError message={sectionsResult.error} />;
  }

  const guest = guestResult.data;
  const households = householdsResult.data;
  const tags = tagsResult.data;
  const existingGuests = guestsResult.data
    .filter(
      (candidate) =>
        candidate.id !== guest.id &&
        !candidate.plusOneFor &&
        candidate.plusOnes.length === 0 &&
        (candidate.householdId === null || candidate.householdId === guest.householdId),
    )
    .map(({ id, firstName, lastName }) => ({ id, firstName, lastName }));
  const canEdit = context.role !== "VIEWER";

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumb={(
          <Breadcrumbs
            items={[
              { href: "/guests", label: "Guests" },
              { label: "Guest details" },
            ]}
          />
        )}
        description="Contact details, household information, and planning notes for this guest."
        title={[guest.title, guest.firstName, guest.lastName].filter(Boolean).join(" ")}
        actions={
          <Link className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#E8E8E3] bg-[#F4F4F1] px-4 py-2 text-[13px] font-medium hover:bg-[#EAEAE7]" href="/guests">
            <Icon name="users" size={15} /> Back to guests
          </Link>
        }
      />

      <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#EAF0E8] text-lg font-semibold text-[#2D5A27]">
              {guest.firstName.charAt(0)}{guest.lastName.charAt(0)}
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2D5A27]">Guest profile</p>
              <h2 className="mt-1 text-xl font-semibold text-[#1C1C1C]">{guest.firstName} {guest.lastName}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone={guest.ageGroup === "ADULT" ? "default" : "gold"}>{formatAgeGroup(guest.ageGroup)}</Badge>
                {guest.household ? <Badge tone="success">{guest.household.name}</Badge> : <Badge>No household</Badge>}
              </div>
              {guest.plusOneFor ? (
                <Link
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#C9DCC5] bg-[#F7FBF5] px-3 py-2 text-xs font-semibold text-[#2D5A27] hover:bg-[#EAF0E8]"
                  href={`/guests/${guest.plusOneFor.id}`}
                >
                  <span className="rounded-full bg-[#DDEBD9] px-2 py-0.5 text-[10px] uppercase tracking-[0.08em]">Plus-one</span>
                  <span>of {guest.plusOneFor.firstName} {guest.plusOneFor.lastName}</span>
                </Link>
              ) : null}
            </div>
          </div>

          <dl className="mt-6 space-y-4 border-t border-[#F0EFEA] pt-5 text-sm">
            <Detail label="Email" value={guest.email} />
            <Detail label="Phone" value={guest.phone} />
            <div className="flex items-start justify-between gap-4">
              <dt className="text-[#8A8A82]">Plus-one</dt>
              <dd className="max-w-[65%] text-right font-medium text-[#1C1C1C]">
                {guest.plusOnes.length > 0 ? guest.plusOnes.map((person) => (
                  <Link className="block text-[#2D5A27] hover:underline" href={`/guests/${person.id}`} key={person.id}>
                    {person.firstName} {person.lastName}
                  </Link>
                )) : "None"}
              </dd>
            </div>
          </dl>

          <div className="mt-6 border-t border-[#F0EFEA] pt-5">
            <p className="text-xs font-medium text-[#6B6B63]">Tags</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {guest.tags.length > 0 ? guest.tags.map((tag) => <Badge key={tag.id} tone="success">{tag.name}</Badge>) : <span className="text-xs text-[#A5A39A]">No tags</span>}
            </div>
          </div>
          <div className="mt-6 border-t border-[#F0EFEA] pt-5">
            <p className="text-xs font-medium text-[#6B6B63]">Wedding sections</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {guest.sections.length > 0 ? guest.sections.map((section) => (
                <Badge key={section.id} tone={section.active ? "success" : "default"}>
                  {section.name}{section.active ? "" : " · Inactive"}
                </Badge>
              )) : <span className="text-xs text-[#A5A39A]">No sections</span>}
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-semibold text-[#1C1C1C]">Notes and requirements</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <InfoBlock label="Dietary requirements" value={guest.dietaryRequirements} empty="No dietary requirements recorded." />
            <InfoBlock label="Notes" value={guest.notes} empty="No notes recorded." />
          </div>
          <p className="mt-6 border-t border-[#F0EFEA] pt-4 text-xs leading-5 text-[#8A8A82]">
            RSVP, meal choices, invitation history, and seating will be added in later planning stages.
          </p>
        </Card>
      </section>

      {canEdit ? (
        <Card className="p-5 sm:p-6">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2D5A27]">Edit guest</p>
            <h2 className="mt-1 text-lg font-semibold text-[#1C1C1C]">Update guest details</h2>
          </div>
          <GuestForm
            existingGuests={existingGuests}
            guest={guest}
            households={households}
            sections={sectionsResult.data}
            tags={tags}
            weddingId={context.wedding.id}
          />
        </Card>
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-[#8A8A82]">{label}</dt>
      <dd className="max-w-[65%] text-right font-medium text-[#1C1C1C]">{value || "Not provided"}</dd>
    </div>
  );
}

function InfoBlock({ label, value, empty }: { label: string; value: string | null; empty: string }) {
  return (
    <div className="rounded-xl border border-[#F0EFEA] bg-[#FAFAF8] p-4">
      <p className="text-xs font-medium text-[#6B6B63]">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#1C1C1C]">{value || <span className="text-[#A5A39A]">{empty}</span>}</p>
    </div>
  );
}

function formatAgeGroup(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function GuestDetailError({ message }: { message: string }) {
  return (
    <Card className="border-[#E7C9C5] bg-[#FFF5F3] p-6 text-[#5C211B]">
      <p className="text-sm font-semibold">Guest unavailable</p>
      <p className="mt-2 text-sm leading-6">{message}</p>
      <Link className="mt-4 inline-flex text-sm font-semibold text-[#2D5A27] hover:underline" href="/guests">Return to guest list</Link>
    </Card>
  );
}
