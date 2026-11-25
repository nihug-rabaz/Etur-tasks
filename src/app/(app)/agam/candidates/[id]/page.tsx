import { Suspense } from "react";
import { AgamCandidateFilePage } from "@/modules/agam/pages/candidate-file-page";
import { keepEvaluatorsInPortal } from "@/modules/agam/lib/evaluator-guard";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await keepEvaluatorsInPortal((await params).id);
  return (
    <Suspense fallback={<p className="p-6 text-sm text-text-muted">טוען…</p>}>
      <AgamCandidateFilePage />
    </Suspense>
  );
}
