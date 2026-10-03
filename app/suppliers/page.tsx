import { PlaceholderPage } from "@/src/components/shared/placeholder-page";
import { WeddingRequiredPage } from "@/src/components/shared/wedding-required-page";
import { NO_INDEX_ROBOTS } from "@/src/seo/site-metadata";

export const metadata = {
  title: "Suppliers",
  robots: NO_INDEX_ROBOTS,
};

export default async function SuppliersPage() {
  return (
    <WeddingRequiredPage feature="Supplier planning">
      <PlaceholderPage
        description="Keep supplier conversations, services, and important details easy to find."
        futureDescription="Supplier records, contacts, contracts, and booking details will be implemented here."
        icon="venue"
        title="Suppliers"
      />
    </WeddingRequiredPage>
  );
}
