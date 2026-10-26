import { redirect } from "next/navigation";
import { redirectMalshabimLogin } from "@/modules/malshabim/lib/auth-redirect";
import { MalshabimHomePage } from "@/modules/malshabim/pages/home-page";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";
import { MalshabimCandidateService } from "@/modules/malshabim/services/candidate.service";

export default async function Page() {
  const access = await new MalshabimAccessService().requireMalshabimAccess();
  if ("error" in access) {
    if (access.status === 401) await redirectMalshabimLogin("/malshabim");
    redirect("/");
  }

  const candidates = await new MalshabimCandidateService().list();

  return (
    <MalshabimHomePage
      initialCandidates={candidates}
      initialRole={access.role}
    />
  );
}
