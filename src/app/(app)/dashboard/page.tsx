import { MainTabsShell } from "@/components/main-tabs/main-tabs-shell";
import { DashboardService } from "@/services/dashboard.service";

export default async function DashboardPage() {
  const service = new DashboardService();
  const tabs = await service.getTabbedMainScreenData();
  return <MainTabsShell tabs={tabs} />;
}
