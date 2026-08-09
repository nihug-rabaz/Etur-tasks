import { NextResponse } from "next/server";
import { AuthorizationService } from "@/services/authorization.service";
import { ModuleRoleService } from "@/shared/services/module-role.service";

export async function GET() {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const moduleRoleService = new ModuleRoleService();
  await moduleRoleService.ensureDefaultAccess(profile.id, profile.role);
  const roles = await moduleRoleService.getRolesForUser(profile.id);

  if (profile.role === "admin") {
    roles.tasks = roles.tasks ?? "admin";
    roles.dovrut = roles.dovrut ?? "admin";
  }

  return NextResponse.json({ roles });
}
