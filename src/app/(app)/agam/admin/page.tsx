import { redirect } from "next/navigation";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamAdminPage } from "@/modules/agam/pages/admin-page";

export default async function Page() {
  const access = await new AgamAccessService().requireAgamAccess("admin");
  if ("error" in access) {
    redirect("/agam");
  }
  return <AgamAdminPage />;
}
