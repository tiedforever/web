import { PlaceholderPage } from "@/src/components/shared/placeholder-page";
import { WeddingRequiredPage } from "@/src/components/shared/wedding-required-page";
import { NO_INDEX_ROBOTS } from "@/src/seo/site-metadata";

export const metadata = {
  title: "Seating plan",
  robots: NO_INDEX_ROBOTS,
};

export default async function SeatingPage() {
  return (
    <WeddingRequiredPage feature="Seating plans">
      <PlaceholderPage
        description="Plan tables and make the room feel right for every guest."
        futureDescription="Seating plans, table layouts, and guest placement will be implemented here."
        icon="grid"
        title="Seating Plan"
      />
    </WeddingRequiredPage>
  );
}
