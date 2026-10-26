import { redirect } from "next/navigation";
import { redirectMalshabimLogin } from "@/modules/malshabim/lib/auth-redirect";
import { MalshabimAdminApprovalsPage } from "@/modules/malshabim/pages/admin-approvals-page";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";
import { MalshabimCandidateService } from "@/modules/malshabim/services/candidate.service";

export default async function Page() {
  const access = await new MalshabimAccessService().requireMalshabimAccess("admin");
  if ("error" in access) {
    if (access.status === 401) {
      await redirectMalshabimLogin("/malshabim/admin/approvals");
    }
    redirect("/malshabim");
  }

  const candidates = await new MalshabimCandidateService().listAwaitingApproval();

  return <MalshabimAdminApprovalsPage initialCandidates={candidates} />;
}
