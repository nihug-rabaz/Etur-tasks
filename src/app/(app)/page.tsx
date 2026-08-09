import { AuthorizationService } from "@/services/authorization.service";
import { ModuleHomeClient } from "@/components/module-home-client";

export default async function PlatformHomePage() {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  const isPlatformAdmin = profile?.role === "admin";

  return <ModuleHomeClient isPlatformAdmin={Boolean(isPlatformAdmin)} />;
}
