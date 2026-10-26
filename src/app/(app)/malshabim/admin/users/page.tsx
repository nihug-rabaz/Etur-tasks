import { redirect } from "next/navigation";
import { redirectMalshabimLogin } from "@/modules/malshabim/lib/auth-redirect";
import { MalshabimAdminUsersPage } from "@/modules/malshabim/pages/admin-users-page";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";

export default async function Page() {
  const access = await new MalshabimAccessService().requireMalshabimAccess("admin");
  if ("error" in access) {
    if (access.status === 401) {
      await redirectMalshabimLogin("/malshabim/admin/users");
    }
    redirect("/malshabim");
  }
  return <MalshabimAdminUsersPage />;
}
