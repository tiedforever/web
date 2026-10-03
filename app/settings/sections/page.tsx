import { PageHeader } from "@/src/components/shared/page-header";
import { Card } from "@/src/components/shared/ui";
import { WeddingRequiredState } from "@/src/components/shared/wedding-required-state";
import { WeddingSectionsManager } from "@/src/components/settings/wedding-sections-manager";
import { getWeddingSections } from "@/src/server/actions/settings/wedding-section.actions";
import { getWeddingPageContext } from "@/src/server/auth/get-wedding-page-context";

export const metadata = {
  title: "Wedding day sections",
};

export const dynamic = "force-dynamic";

export default async function WeddingSectionsSettingsPage() {
  const context = await getWeddingPageContext();

  if (!context) {
    return <WeddingRequiredState feature="Wedding day sections" />;
  }

  const result = await getWeddingSections();

  return (
    <div className="space-y-6">
      <PageHeader
        description="Customize the parts of your wedding that guests may eventually be invited to."
        eyebrow="Wedding settings"
        title="Wedding Day Sections"
      />
      {result.success ? (
        <WeddingSectionsManager
            key={context.wedding.id}
            initialSections={result.data}
            readOnly={context.role === "VIEWER"}
            weddingId={context.wedding.id}
          />
      ) : (
        <Card className="border-[#E7C9C5] bg-[#FFF8F6] p-5 sm:p-6">
          <h2 className="text-base font-semibold text-[#5C211B]">
            Unable to load wedding day sections
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#7A4A43]">{result.error}</p>
        </Card>
      )}
    </div>
  );
}
