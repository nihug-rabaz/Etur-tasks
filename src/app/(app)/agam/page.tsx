import { redirect } from "next/navigation";
import { AgamDashboardPage } from "@/modules/agam/pages/dashboard-page";
import { localTodayKey, resolveTimelineCycle } from "@/modules/agam/lib/cycle-timeline";
import { buildCycleTimelineEvents } from "@/modules/agam/lib/cycle-schedule";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { AgamCycleService } from "@/modules/agam/services/cycle.service";
import { AgamOrgSettingsService } from "@/modules/agam/services/org-settings.service";
import { AgamTaskLinkService } from "@/modules/agam/services/task-link.service";

export default async function Page() {
  const access = await new AgamAccessService().requireAgamAccess();
  if ("error" in access) {
    redirect(access.status === 401 ? "/login" : "/");
  }

  const [candidates, settings, generalTasks, cycles] = await Promise.all([
    new AgamCandidateService().list(false),
    new AgamOrgSettingsService().getSingleton(),
    new AgamTaskLinkService().list({ includeGeneral: true }),
    new AgamCycleService().list(false),
  ]);

  const timelineCycle = resolveTimelineCycle(cycles, localTodayKey());
  const timelineEvents = buildCycleTimelineEvents(timelineCycle);

  return (
    <AgamDashboardPage
      initialCandidates={candidates}
      initialSettings={settings}
      initialRole={access.role}
      initialTimelineEvents={timelineEvents}
      initialTimelineCycle={timelineCycle}
      initialGeneralTasks={generalTasks}
      initialCycles={cycles}
      initialCurrentUserId={access.profile.id}
    />
  );
}
