import { Suspense } from "react";
import { AgamCandidateFilePage } from "@/modules/agam/pages/candidate-file-page";

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-text-muted">טוען…</p>}>
      <AgamCandidateFilePage />
    </Suspense>
  );
}
