import { Suspense } from "react";
import { AuthorizationService } from "@/services/authorization.service";
import { ModuleHomeClient } from "@/components/module-home-client";

export default async function PlatformHomePage() {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  const isPlatformAdmin = profile?.role === "admin";

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-text-muted">
          מעביר למערכת…
        </div>
      }
    >
      <ModuleHomeClient isPlatformAdmin={Boolean(isPlatformAdmin)} />
    </Suspense>
  );
}
