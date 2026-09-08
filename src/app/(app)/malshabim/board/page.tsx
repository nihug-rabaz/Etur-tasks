import { redirect } from "next/navigation";
import { MalshabimBoardPage } from "@/modules/malshabim/pages/board-page";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";
import { MalshabimCandidateService } from "@/modules/malshabim/services/candidate.service";

export default async function Page() {
  const access = await new MalshabimAccessService().requireMalshabimAccess();
  if ("error" in access) {
    redirect(access.status === 401 ? "/login" : "/");
  }
  const candidates = await new MalshabimCandidateService().list();
  return (
    <MalshabimBoardPage initialCandidates={candidates} initialRole={access.role} />
  );
}
