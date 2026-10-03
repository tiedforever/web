import { PlaceholderPage } from "@/src/components/shared/placeholder-page";
import { WeddingRequiredPage } from "@/src/components/shared/wedding-required-page";
import { NO_INDEX_ROBOTS } from "@/src/seo/site-metadata";

export const metadata = {
  title: "Notes",
  robots: NO_INDEX_ROBOTS,
};

export default async function NotesPage() {
  return (
    <WeddingRequiredPage feature="Wedding notes">
      <PlaceholderPage
        description="Capture the ideas, reminders, and decisions that do not belong in a checklist task."
        futureDescription="Wedding notes, shared ideas, and planning references will be implemented here."
        icon="note"
        title="Notes"
      />
    </WeddingRequiredPage>
  );
}
