import { Suspense } from "react";
import { DovrutApprovalsPage } from "@/modules/dovrut/pages/approvals-page";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-text-muted">טוען…</div>}>
      <DovrutApprovalsPage />
    </Suspense>
  );
}
