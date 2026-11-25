import { AgamCyclesPage } from "@/modules/agam/pages/cycles-page";
import { keepEvaluatorsInPortal } from "@/modules/agam/lib/evaluator-guard";

export default async function Page() {
  await keepEvaluatorsInPortal();
  return <AgamCyclesPage />;
}
