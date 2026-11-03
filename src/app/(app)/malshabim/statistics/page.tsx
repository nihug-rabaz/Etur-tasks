import { redirect } from "next/navigation";
import { redirectMalshabimLogin } from "@/modules/malshabim/lib/auth-redirect";
import { MalshabimStatisticsPage } from "@/modules/malshabim/pages/statistics-page";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";
import { MalshabimCandidateService } from "@/modules/malshabim/services/candidate.service";

export default async function Page() {
  const access = await new MalshabimAccessService().requireMalshabimAccess();
  if ("error" in access) {
    if (access.status === 401) await redirectMalshabimLogin("/malshabim/statistics");
    redirect("/");
  }
  const candidates = await new MalshabimCandidateService().list();
  return <MalshabimStatisticsPage initialCandidates={candidates} />;
}
