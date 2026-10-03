import { PlaceholderPage } from "@/src/components/shared/placeholder-page";
import { WeddingRequiredPage } from "@/src/components/shared/wedding-required-page";
import { NO_INDEX_ROBOTS } from "@/src/seo/site-metadata";

export const metadata = {
  title: "Documents",
  robots: NO_INDEX_ROBOTS,
};

export default async function DocumentsPage() {
  return (
    <WeddingRequiredPage feature="Wedding documents">
      <PlaceholderPage
        description="Keep contracts, inspiration, and planning documents close to the decisions they support."
        futureDescription="Shared wedding documents and file organisation will be implemented here."
        icon="file"
        title="Documents"
      />
    </WeddingRequiredPage>
  );
}
