import { redirect } from "next/navigation";
import { NagadimAdminUsersPage } from "@/modules/nagadim/pages/admin-users-page";
import { NagadimAccessService } from "@/modules/nagadim/services/access.service";

export default async function Page() {
  const access = await new NagadimAccessService().requireNagadimAccess("admin");
  if ("error" in access) {
    redirect(access.status === 401 ? "/login" : "/nagadim");
  }
  return <NagadimAdminUsersPage />;
}
