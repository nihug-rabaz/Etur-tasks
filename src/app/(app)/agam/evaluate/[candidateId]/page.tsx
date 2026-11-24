import { AgamEvaluatorCandidatePage } from "@/modules/agam/pages/evaluator-candidate-page";

export default async function Page({ params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params;
  return <AgamEvaluatorCandidatePage candidateId={candidateId} />;
}
