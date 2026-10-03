import Link from "next/link";

import { HouseholdCreationTrigger } from "@/src/components/guests/household-creation-trigger";
import { Breadcrumbs } from "@/src/components/shared/breadcrumbs";
import { Icon } from "@/src/components/shared/icons";
import { PageHeader } from "@/src/components/shared/page-header";
import { Card, EmptyState } from "@/src/components/shared/ui";
import { WeddingRequiredState } from "@/src/components/shared/wedding-required-state";
import { getWeddingPageContext } from "@/src/server/auth/get-wedding-page-context";
import {
  HouseholdListRepositoryError,
  householdListRepository,
} from "@/src/server/repositories/household-list.repository";
import { NO_INDEX_ROBOTS } from "@/src/seo/site-metadata";

export const metadata = {
  title: "Households",
  robots: NO_INDEX_ROBOTS,
};

export const dynamic = "force-dynamic";

export default async function HouseholdsPage() {
  const context = await getWeddingPageContext();

  if (!context) {
    return <WeddingRequiredState feature="Your households" />;
  }
  const canEdit = context.role !== "VIEWER";

  let result;
  try {
    result = await householdListRepository.getHouseholdList(
      context.wedding.id,
      { includeTags: canEdit },
    );
  } catch (error) {
    const message = error instanceof HouseholdListRepositoryError
      ? error.message
      : "Unable to load households.";
    return <HouseholdsError message={message} />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumb={(
          <Breadcrumbs
            items={[
              { href: "/guests", label: "Guests" },
              { label: "Households" },
            ]}
          />
        )}
        description="Keep shared postal details together and move guests between households as plans change."
        title="Households"
        actions={
          <>
            <Link className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#E8E8E3] bg-[#F4F4F1] px-4 py-2 text-[13px] font-medium hover:bg-[#EAEAE7]" href="/guests">
              <Icon name="users" size={15} />
              Guest list
            </Link>
            {canEdit ? <HouseholdCreationTrigger tags={result.tags} weddingId={context.wedding.id} /> : null}
          </>
        }
      />

      {result.households.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2">
          {result.households.map((household) => (
            <Card className="p-5" key={household.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link className="text-base font-semibold text-[#1C1C1C] hover:text-[#2D5A27]" href={`/guests/households/${household.id}`}>
                    {household.name}
                  </Link>
                  <p className="mt-1 text-sm leading-5 text-[#6B6B63]">
                    {household.addressLineOne}, {household.townCity}, {household.postcode}
                  </p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF0E8] text-[#2D5A27]">
                  <Icon name="pin" size={18} />
                </span>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-[#F0EFEA] pt-4 text-xs text-[#8A8A82]">
                <span>
                  {household.guestCount} {household.guestCount === 1 ? "guest" : "guests"}
                  {household.primaryGuest ? ` · Primary: ${household.primaryGuest.firstName} ${household.primaryGuest.lastName}` : ""}
                </span>
                <Link className="font-semibold text-[#2D5A27] hover:underline" href={`/guests/households/${household.id}`}>
                  View household
                </Link>
              </div>
            </Card>
          ))}
        </section>
      ) : (
        <Card className="px-6 py-16">
          <EmptyState
            description="Create a household when two or more guests share an address."
            icon={<Icon name="pin" size={22} />}
            title="No households yet"
          />
        </Card>
      )}
    </div>
  );
}

function HouseholdsError({ message }: { message: string }) {
  return (
    <Card className="border-[#E7C9C5] bg-[#FFF5F3] p-6 text-[#5C211B]">
      <p className="text-sm font-semibold">Households unavailable</p>
      <p className="mt-2 text-sm leading-6">{message}</p>
    </Card>
  );
}
