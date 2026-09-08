import { AuthorizationService } from "@/services/authorization.service";
import { ModuleRoleService } from "@/shared/services/module-role.service";
import type { ModuleRole } from "@/shared/modules/types";

export class MalshabimAccessService {
  private readonly authorizationService = new AuthorizationService();
  private readonly moduleRoleService = new ModuleRoleService();

  public async requireProfile() {
    const profile = await this.authorizationService.getCurrentProfile();
    if (!profile || !profile.is_approved) return null;
    return profile;
  }

  public async getModuleRole(userId: string): Promise<ModuleRole | null> {
    const roles = await this.moduleRoleService.getRolesForUser(userId);
    return roles.malshabim ?? null;
  }

  public async requireMalshabimAccess(minRole: "any" | "user" | "admin" = "any") {
    const profile = await this.requireProfile();
    if (!profile) return { error: "Unauthorized" as const, status: 401 as const };

    let role = await this.getModuleRole(profile.id);
    if (!role) {
      const real = await this.authorizationService.getRealProfile();
      if (real?.role === "admin") role = "admin";
    }
    if (!role) return { error: "Forbidden" as const, status: 403 as const };

    if (minRole === "admin" && !this.canAdmin(role)) {
      return { error: "Forbidden" as const, status: 403 as const };
    }
    if (minRole === "user" && !this.canEdit(role)) {
      return { error: "Forbidden" as const, status: 403 as const };
    }

    return { profile, role };
  }

  public canAdmin(role: ModuleRole): boolean {
    return role === "admin";
  }

  public canEdit(role: ModuleRole): boolean {
    return role === "admin" || role === "user";
  }

  public canView(role: ModuleRole): boolean {
    return Boolean(role);
  }

  public roleLabel(role: ModuleRole): string {
    if (role === "admin") return "מנהל";
    if (role === "viewer") return "צופה";
    return "משתמש";
  }
}
