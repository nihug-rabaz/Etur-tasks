import { AgamCandidatesPage } from "@/modules/agam/pages/candidates-page";
import { keepEvaluatorsInPortal } from "@/modules/agam/lib/evaluator-guard";

export default async function Page() {
  await keepEvaluatorsInPortal();
  return <AgamCandidatesPage archived={false} />;
}
