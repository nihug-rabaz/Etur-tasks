import { AgamCycleDetailPage } from "@/modules/agam/pages/cycle-detail-page";
import { keepEvaluatorsInPortal } from "@/modules/agam/lib/evaluator-guard";

export default async function Page() {
  await keepEvaluatorsInPortal();
  return <AgamCycleDetailPage />;
}
