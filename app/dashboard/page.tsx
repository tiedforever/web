import { DashboardWorkspaceView } from "@/src/components/workspace/workspace-destinations";
import { measurePerformance } from "@/src/server/logging/performance";
import { NO_INDEX_ROBOTS } from "@/src/seo/site-metadata";

export const metadata = {
  title: "Dashboard",
  robots: NO_INDEX_ROBOTS,
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  return measurePerformance("dashboard.page.total", async () => (
    <DashboardWorkspaceView />
  ));
}
