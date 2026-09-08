import { Suspense } from "react";
import { redirect } from "next/navigation";
import { NagadimGapsPage } from "@/modules/nagadim/pages/gaps-page";
import { NagadimAccessService } from "@/modules/nagadim/services/access.service";

export default async function Page() {
  const access = await new NagadimAccessService().requireNagadimAccess();
  if ("error" in access) {
    redirect(access.status === 401 ? "/login" : "/");
  }
  return (
    <Suspense fallback={<p className="p-6 text-sm text-text-muted">טוען…</p>}>
      <NagadimGapsPage />
    </Suspense>
  );
}
