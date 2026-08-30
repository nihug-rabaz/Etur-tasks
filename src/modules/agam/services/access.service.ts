import { AuthorizationService } from "@/services/authorization.service";
import { ModuleRoleService } from "@/shared/services/module-role.service";
import type { ModuleRole } from "@/shared/modules/types";
import type { AgamUploadSource } from "@/modules/agam/types";

export class AgamAccessService {
  private readonly authorizationService = new AuthorizationService();
  private readonly moduleRoleService = new ModuleRoleService();

  public async requireProfile() {
    const profile = await this.authorizationService.getCurrentProfile();
    if (!profile || !profile.is_approved) return null;
    return profile;
  }

  public async getModuleRole(userId: string): Promise<ModuleRole | null> {
    const roles = await this.moduleRoleService.getRolesForUser(userId);
    return roles.agam ?? null;
  }

  public async requireAgamAccess(minRole: "any" | "ramad" | "admin" = "any") {
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
    if (minRole === "ramad" && !this.canRamad(role)) {
      return { error: "Forbidden" as const, status: 403 as const };
    }

    return { profile, role };
  }

  public canAdmin(role: ModuleRole): boolean {
    return role === "admin";
  }

  public canRamad(role: ModuleRole): boolean {
    return role === "admin" || role === "ramad";
  }

  public canEvaluate(role: ModuleRole): boolean {
    return role === "admin" || role === "ramad" || role === "user";
  }

  public canView(role: ModuleRole): boolean {
    return Boolean(role);
  }

  public uploadSourceFor(role: ModuleRole): AgamUploadSource {
    if (role === "admin") return "admin";
    if (role === "ramad") return "ramad";
    return "evaluator";
  }

  public roleLabel(role: ModuleRole): string {
    if (role === "admin") return "מנהל";
    if (role === "ramad") return "רמ״ד אומ״ץ";
    if (role === "viewer") return "צופה";
    return "מעריך";
  }
}
