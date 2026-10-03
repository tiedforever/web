import { GuestsWorkspaceView } from "@/src/components/workspace/workspace-destinations";
import { Card } from "@/src/components/shared/ui";
import { parseGuestListFilters } from "@/src/server/repositories/guest-list.repository";
import { measurePerformance } from "@/src/server/logging/performance";
import { normalizeGuestQueryFilters } from "@/src/types/guests";
import { NO_INDEX_ROBOTS } from "@/src/seo/site-metadata";

export const metadata = {
  title: "Guests",
  robots: NO_INDEX_ROBOTS,
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function renderGuestsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = (await searchParams) ?? {};
  const parsedFilters = parseGuestListFilters({
    search: firstParam(params.search),
    ageGroup: firstParam(params.ageGroup),
    tagId: firstParam(params.tagId),
    sectionId: firstParam(params.sectionId),
  });

  if ("error" in parsedFilters) {
    return <GuestPageError message={parsedFilters.error} />;
  }

  return (
      <GuestsWorkspaceView filters={normalizeGuestQueryFilters(parsedFilters.value)} />
  );
}

export default async function GuestsPage(props: {
  searchParams?: SearchParams;
}) {
  return measurePerformance("guests.page.total", () => renderGuestsPage(props));
}

function GuestPageError({ message }: { message: string }) {
  return (
    <Card className="border-[#E7C9C5] bg-[#FFF5F3] p-6 text-[#5C211B]">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-red-700">Guest list unavailable</p>
      <h1 className="mt-2 text-2xl font-semibold">We could not load your guests</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-red-900">{message}</p>
    </Card>
  );
}
