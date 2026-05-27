import { MainTabsShell } from "@/components/main-tabs/main-tabs-shell";
import { AuthorizationService } from "@/services/authorization.service";
import { DashboardService } from "@/services/dashboard.service";

export default async function DashboardPage() {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.ensureApproved();
  const access = await authorizationService.getTaskAccessContext(profile);
  const service = new DashboardService();
  const tabs = await service.getTabbedMainScreenData(access);
  return <MainTabsShell tabs={tabs} />;
}
