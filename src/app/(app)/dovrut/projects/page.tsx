import { Suspense } from "react";
import { DovrutProjectsPage } from "@/modules/dovrut/pages/projects-page";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-sm text-text-muted">טוען פרויקטים…</div>}>
      <DovrutProjectsPage />
    </Suspense>
  );
}
