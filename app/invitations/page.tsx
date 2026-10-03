import { PlaceholderPage } from "@/src/components/shared/placeholder-page";
import { WeddingRequiredPage } from "@/src/components/shared/wedding-required-page";
import { NO_INDEX_ROBOTS } from "@/src/seo/site-metadata";

export const metadata = {
  title: "Guest invitations",
  robots: NO_INDEX_ROBOTS,
};

export default async function GuestInvitationsPage() {
  return (
    <WeddingRequiredPage feature="Guest invitations">
      <PlaceholderPage
        description="Prepare guest invitation details and keep stationery planning in one place."
        futureDescription="Guest invitation planning, stationery details, and sending workflows will be implemented here."
        icon="file"
        title="Guest invitations"
      />
    </WeddingRequiredPage>
  );
}
