import { DovrutApprovalQueuePage } from "@/modules/dovrut/pages/approvals-page";
import { DovrutChiefRabbiDashboardPage } from "@/modules/dovrut/pages/chief-rabbi-dashboard-page";

export default function Page() {
  return (
    <div className="space-y-8">
      <DovrutChiefRabbiDashboardPage />
      <DovrutApprovalQueuePage status="waiting_chief_rabbi" title="תור אישור רבצ״ר" />
    </div>
  );
}
