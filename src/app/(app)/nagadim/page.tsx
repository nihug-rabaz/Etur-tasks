import { redirect } from "next/navigation";
import { NagadimDashboardPage } from "@/modules/nagadim/pages/dashboard-page";
import { NagadimAccessService } from "@/modules/nagadim/services/access.service";

export default async function Page() {
  const access = await new NagadimAccessService().requireNagadimAccess();
  if ("error" in access) {
    redirect(access.status === 401 ? "/login" : "/");
  }
  return <NagadimDashboardPage />;
}
