import { PlaceholderPage } from "@/src/components/shared/placeholder-page";
import { WeddingRequiredPage } from "@/src/components/shared/wedding-required-page";
import { NO_INDEX_ROBOTS } from "@/src/seo/site-metadata";

export const metadata = {
  title: "Budget",
  robots: NO_INDEX_ROBOTS,
};

export default async function BudgetPage() {
  return (
    <WeddingRequiredPage feature="Budget planning">
      <PlaceholderPage
        description="Keep spending decisions clear while the wedding comes together."
        futureDescription="Budget categories, expenses, and payments will be managed here."
        icon="dollar"
        title="Budget"
      />
    </WeddingRequiredPage>
  );
}
