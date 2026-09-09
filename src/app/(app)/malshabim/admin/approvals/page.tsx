import { redirect } from "next/navigation";
import { MalshabimAdminApprovalsPage } from "@/modules/malshabim/pages/admin-approvals-page";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";
import { MalshabimCandidateService } from "@/modules/malshabim/services/candidate.service";

export default async function Page() {
  const access = await new MalshabimAccessService().requireMalshabimAccess("admin");
  if ("error" in access) {
    redirect(access.status === 401 ? "/login" : "/malshabim");
  }

  const candidates = await new MalshabimCandidateService().listAwaitingApproval();

  return <MalshabimAdminApprovalsPage initialCandidates={candidates} />;
}
