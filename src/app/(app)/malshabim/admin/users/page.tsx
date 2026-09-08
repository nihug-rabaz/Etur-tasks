import { redirect } from "next/navigation";
import { MalshabimAdminUsersPage } from "@/modules/malshabim/pages/admin-users-page";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";

export default async function Page() {
  const access = await new MalshabimAccessService().requireMalshabimAccess("admin");
  if ("error" in access) {
    redirect(access.status === 401 ? "/login" : "/malshabim");
  }
  return <MalshabimAdminUsersPage />;
}
