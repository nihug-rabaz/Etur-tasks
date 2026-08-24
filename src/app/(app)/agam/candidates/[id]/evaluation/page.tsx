"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AgamEvaluationPage } from "@/modules/agam/pages/evaluation-page";

function EvaluationInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  return (
    <AgamEvaluationPage
      candidateId={params.id}
      evalId={searchParams.get("evalId") || undefined}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-text-muted">טוען…</p>}>
      <EvaluationInner />
    </Suspense>
  );
}
