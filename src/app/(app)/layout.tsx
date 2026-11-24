import { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { isAgamCandidateSoldier, isAgamEvaluatorOnly } from "@/modules/agam/lib/candidate-access";
import { AuthorizationService } from "@/services/authorization.service";
import { ModuleRoleService } from "@/shared/services/module-role.service";

export default async function ApplicationLayout({ children }: { children: ReactNode }) {
  const authorizationService = new AuthorizationService();
  await authorizationService.ensureApproved();
  const profile = await authorizationService.getCurrentProfile();
  const moduleRoles = profile
    ? await new ModuleRoleService().getRolesForUser(profile.id)
    : {};
  const candidateShell = isAgamCandidateSoldier({
    platformRole: profile?.role,
    moduleRoles,
  });
  const evaluatorShell = isAgamEvaluatorOnly({
    platformRole: profile?.role,
    moduleRoles,
  });
  return (
    <AppShell candidateShell={candidateShell} evaluatorShell={evaluatorShell}>
      {children}
    </AppShell>
  );
}
