import { redirect } from "next/navigation";
import { AgamDashboardPage } from "@/modules/agam/pages/dashboard-page";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { AgamOrgSettingsService } from "@/modules/agam/services/org-settings.service";

export default async function Page() {
  const access = await new AgamAccessService().requireAgamAccess();
  if ("error" in access) {
    redirect(access.status === 401 ? "/login" : "/");
  }

  const [candidates, settings] = await Promise.all([
    new AgamCandidateService().list(false),
    new AgamOrgSettingsService().getSingleton(),
  ]);

  return (
    <AgamDashboardPage
      initialCandidates={candidates}
      initialSettings={settings}
      initialRole={access.role}
    />
  );
}
