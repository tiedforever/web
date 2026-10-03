import { PlaceholderPage } from "@/src/components/shared/placeholder-page";
import { WeddingRequiredPage } from "@/src/components/shared/wedding-required-page";
import { NO_INDEX_ROBOTS } from "@/src/seo/site-metadata";

export const metadata = {
  title: "Timeline",
  robots: NO_INDEX_ROBOTS,
};

export default async function TimelinePage() {
  return (
    <WeddingRequiredPage feature="Wedding timeline">
      <PlaceholderPage
        description="See the important moments and milestones that lead to the wedding day."
        futureDescription="Wedding milestones, schedules, and day-of timing will be implemented here."
        icon="calendar"
        title="Timeline"
      />
    </WeddingRequiredPage>
  );
}
