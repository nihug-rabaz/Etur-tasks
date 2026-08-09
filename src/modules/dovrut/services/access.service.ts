import { AuthorizationService } from "@/services/authorization.service";
import { ModuleRoleService } from "@/shared/services/module-role.service";
import type { ModuleRole } from "@/shared/modules/types";

export class DovrutAccessService {
  private readonly authorizationService = new AuthorizationService();
  private readonly moduleRoleService = new ModuleRoleService();

  public async requireProfile() {
    const profile = await this.authorizationService.getCurrentProfile();
    if (!profile || !profile.is_approved) return null;
    await this.moduleRoleService.ensureDefaultAccess(profile.id, profile.role);
    return profile;
  }

  public async getModuleRole(userId: string, platformRole: string): Promise<ModuleRole | null> {
    if (platformRole === "admin") return "admin";
    const roles = await this.moduleRoleService.getRolesForUser(userId);
    return roles.dovrut ?? null;
  }

  public async requireDovrutAccess(minRole: ModuleRole | "any" = "any") {
    const profile = await this.requireProfile();
    if (!profile) return { error: "Unauthorized" as const, status: 401 as const };

    const role = await this.getModuleRole(profile.id, profile.role);
    if (!role) return { error: "Forbidden" as const, status: 403 as const };

    if (minRole === "admin" && role !== "admin" && profile.role !== "admin") {
      return { error: "Forbidden" as const, status: 403 as const };
    }

    return { profile, role };
  }

  public canManageUsers(role: ModuleRole, platformRole: string): boolean {
    return role === "admin" || platformRole === "admin";
  }

  public canDelete(role: ModuleRole, platformRole: string): boolean {
    return role === "admin" || platformRole === "admin";
  }

  public canForceApproval(role: ModuleRole, platformRole: string): boolean {
    return role === "admin" || platformRole === "admin";
  }

  public canEditContent(role: ModuleRole): boolean {
    return role === "admin" || role === "user";
  }

  public canApprove(role: ModuleRole, platformRole: string): boolean {
    return role === "admin" || role === "approver" || platformRole === "admin";
  }

  public roleLabel(role: ModuleRole): string {
    if (role === "admin") return "מנהל";
    if (role === "approver") return "מאשר";
    return "חפ״ש";
  }
}
