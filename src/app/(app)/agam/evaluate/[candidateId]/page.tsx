import { Suspense } from "react";
import { AgamEvaluatorCandidatePage } from "@/modules/agam/pages/evaluator-candidate-page";

export default async function Page({ params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params;
  return (
    <Suspense fallback={<p className="p-6 text-sm text-text-muted">טוען…</p>}>
      <AgamEvaluatorCandidatePage candidateId={candidateId} />
    </Suspense>
  );
}
