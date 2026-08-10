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
  const roles = await moduleRoleService.getRolesForUser(profile.id);
  return NextResponse.json({ roles });
}
