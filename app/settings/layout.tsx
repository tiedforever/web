import type { ReactNode } from "react";

import { SettingsNavigation } from "@/src/components/settings/settings-navigation";
import { NO_INDEX_ROBOTS } from "@/src/seo/site-metadata";

export const metadata = {
  title: "Settings",
  robots: NO_INDEX_ROBOTS,
};

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-8">
      <SettingsNavigation />
      {children}
    </div>
  );
}
