import Link from "next/link";

import { GuestCreationTrigger } from "@/src/components/guests/guest-creation-trigger";
import { HouseholdMembers } from "@/src/components/guests/household-members";
import { HouseholdForm } from "@/src/components/guests/household-form";
import { Breadcrumbs } from "@/src/components/shared/breadcrumbs";
import { Icon } from "@/src/components/shared/icons";
import { PageHeader } from "@/src/components/shared/page-header";
import { Badge, Card } from "@/src/components/shared/ui";
import { WeddingRequiredState } from "@/src/components/shared/wedding-required-state";
import { getGuests } from "@/src/server/actions/guests/guest.actions";
import { getHousehold } from "@/src/server/actions/guests/household.actions";
import { getGuestTags } from "@/src/server/actions/guests/guest-tag.actions";
import { getWeddingSections } from "@/src/server/actions/settings/wedding-section.actions";
import { getWeddingPageContext } from "@/src/server/auth/get-wedding-page-context";
import { NO_INDEX_ROBOTS } from "@/src/seo/site-metadata";

export const metadata = {
  title: "Household details",
  robots: NO_INDEX_ROBOTS,
};

export const dynamic = "force-dynamic";

export default async function HouseholdDetailPage({
  params,
}: {
  params: Promise<{ householdId: string }>;
}) {
  const context = await getWeddingPageContext();

  if (!context) {
    return <WeddingRequiredState feature="Household details" />;
  }
  const { householdId } = await params;
  const householdResult = await getHousehold(householdId);
  const guestsResult = await getGuests({ unassignedHousehold: true });
  const tagsResult = await getGuestTags();
  const sectionsResult = await getWeddingSections();

  if (!householdResult.success) {
    return <HouseholdError message={householdResult.error} />;
  }
  if (!guestsResult.success) {
    return <HouseholdError message={guestsResult.error} />;
  }
  if (!tagsResult.success) {
    return <HouseholdError message={tagsResult.error} />;
  }
  if (!sectionsResult.success) {
    return <HouseholdError message={sectionsResult.error} />;
  }

  const household = householdResult.data;
  const guestsWithoutHousehold = guestsResult.data;
  const canEdit = context.role !== "VIEWER";

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumb={(
          <Breadcrumbs
            items={[
              { href: "/guests", label: "Guests" },
              { href: "/guests/households", label: "Households" },
              { label: "Household details" },
            ]}
          />
        )}
        description="Shared postal details and the guests currently linked to this household."
        title={household.name}
        actions={
          <>
            <Link className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#E8E8E3] bg-[#F4F4F1] px-4 py-2 text-[13px] font-medium hover:bg-[#EAEAE7]" href="/guests"><Icon name="users" size={15} /> Guest list</Link>
            {canEdit && tagsResult.success ? (
              <GuestCreationTrigger
                buttonLabel="Add member"
                households={[{ id: household.id, name: household.name }]}
                lockedHouseholdId={household.id}
                tags={tagsResult.data}
                sections={sectionsResult.data.filter((section) => section.active)}
                weddingId={context.wedding.id}
              />
            ) : null}
          </>
        }
      />

      <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2D5A27]">Shared address</p>
              <p className="mt-4 text-sm leading-6 text-[#1C1C1C]">
                {household.addressLineOne}<br />
                {household.addressLineTwo ? <>{household.addressLineTwo}<br /></> : null}
                {household.townCity}<br />
                {household.countyRegion ? <>{household.countyRegion}<br /></> : null}
                {household.postcode}<br />
                {household.country}
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF0E8] text-[#2D5A27]"><Icon name="pin" size={18} /></span>
          </div>
          {household.notes ? <p className="mt-5 border-t border-[#F0EFEA] pt-4 text-xs leading-5 text-[#6B6B63]">{household.notes}</p> : null}
          <div className="mt-5 flex items-center gap-2 border-t border-[#F0EFEA] pt-4">
            <Badge tone="success">{household.guests.length} members</Badge>
            {household.primaryGuest ? <Badge>Primary: {household.primaryGuest.firstName} {household.primaryGuest.lastName}</Badge> : null}
            {context.role === "VIEWER" ? <Badge>Read only</Badge> : null}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <HouseholdMembers canEdit={canEdit} household={household} guestsWithoutHousehold={guestsWithoutHousehold} weddingId={context.wedding.id} />
        </Card>
      </section>

      {canEdit ? (
        <Card className="p-5 sm:p-6">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2D5A27]">Edit household</p>
            <h2 className="mt-1 text-lg font-semibold text-[#1C1C1C]">Update address or notes</h2>
          </div>
          <HouseholdForm household={household} weddingId={context.wedding.id} />
        </Card>
      ) : null}
    </div>
  );
}

function HouseholdError({ message }: { message: string }) {
  return (
    <Card className="border-[#E7C9C5] bg-[#FFF5F3] p-6 text-[#5C211B]">
      <p className="text-sm font-semibold">Household unavailable</p>
      <p className="mt-2 text-sm leading-6">{message}</p>
      <Link className="mt-4 inline-flex text-sm font-semibold text-[#2D5A27] hover:underline" href="/guests/households">
        Return to households
      </Link>
    </Card>
  );
}
