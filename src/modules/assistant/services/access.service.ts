import { AuthorizationService } from "@/services/authorization.service";
import { ImpersonationService } from "@/services/impersonation.service";
import { ModuleRoleService } from "@/shared/services/module-role.service";
import type { ModuleAccessContext, ModuleRole } from "@/shared/modules/types";
import type { Profile } from "@/types/models";

export type AssistantAccessOk = {
  ok: true;
  profile: Profile;
  isPlatformAdmin: boolean;
  moduleRoles: Record<string, ModuleRole>;
  access: ModuleAccessContext;
};

export type AssistantAccessDenied = {
  ok: false;
  error: "Unauthorized" | "Forbidden" | "Impersonating";
  status: 401 | 403;
};

export class AssistantAccessService {
  private readonly authorizationService = new AuthorizationService();
  private readonly moduleRoleService = new ModuleRoleService();
  private readonly impersonationService = new ImpersonationService();

  public async requireAccess(): Promise<AssistantAccessOk | AssistantAccessDenied> {
    const profile = await this.authorizationService.getRealProfile();
    if (!profile) {
      return { ok: false, error: "Unauthorized", status: 401 };
    }
    if (!profile.is_approved) {
      return { ok: false, error: "Forbidden", status: 403 };
    }

    const snapshot = await this.impersonationService.getSnapshot();
    if (snapshot.active) {
      return { ok: false, error: "Impersonating", status: 403 };
    }

    const moduleRoles = await this.moduleRoleService.getRolesForUser(profile.id);
    const isPlatformAdmin = profile.role === "admin";
    const hasRamad = Object.values(moduleRoles).some((role) => role === "ramad");

    if (!isPlatformAdmin && !hasRamad) {
      return { ok: false, error: "Forbidden", status: 403 };
    }

    return {
      ok: true,
      profile,
      isPlatformAdmin,
      moduleRoles,
      access: {
        isPlatformAdmin,
        moduleRoles,
      },
    };
  }
}
