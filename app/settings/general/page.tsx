import { PageHeader } from "@/src/components/shared/page-header";
import { Card } from "@/src/components/shared/ui";
import { WeddingGeneralForm } from "@/src/components/settings/wedding-general-form";
import { WeddingRequiredState } from "@/src/components/shared/wedding-required-state";
import { getWeddingPageContext } from "@/src/server/auth/get-wedding-page-context";
import { getWeddingGeneralSettings } from "@/src/server/actions/settings/wedding-settings.actions";

export const metadata = {
  title: "General settings",
};

export const dynamic = "force-dynamic";

export default async function GeneralSettingsPage() {
  const context = await getWeddingPageContext();

  if (!context) {
    return <WeddingRequiredState feature="General wedding settings" />;
  }

  const result = await getWeddingGeneralSettings();

  return (
    <div className="space-y-6">
      <PageHeader
        description="Set the core details used throughout your wedding workspace."
        eyebrow="Wedding settings"
        title="General"
      />
      {result.success ? (
        <WeddingGeneralForm
          key={context.wedding.id}
          initialData={result.data}
          readOnly={context.role === "VIEWER"}
        />
      ) : (
        <SettingsError message={result.error} />
      )}
    </div>
  );
}

function SettingsError({ message }: { message: string }) {
  return (
    <Card className="border-[#E7C9C5] bg-[#FFF8F6] p-5 sm:p-6">
      <h2 className="text-base font-semibold text-[#5C211B]">Unable to load settings</h2>
      <p className="mt-2 text-sm leading-6 text-[#7A4A43]">{message}</p>
    </Card>
  );
}
