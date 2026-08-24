"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AgamInterviewPage } from "@/modules/agam/pages/interview-page";

function InterviewInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  return (
    <AgamInterviewPage
      candidateId={params.id}
      interviewId={searchParams.get("interviewId") || undefined}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-text-muted">טוען…</p>}>
      <InterviewInner />
    </Suspense>
  );
}
