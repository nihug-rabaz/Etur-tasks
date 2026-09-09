import { NextResponse } from "next/server";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";
import { ModuleRoleService } from "@/shared/services/module-role.service";

export async function GET() {
  const access = await new MalshabimAccessService().requireMalshabimAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const moduleUsers = await new ModuleRoleService().listModuleUsers("malshabim");
  const interviewers = moduleUsers
    .filter((user) => user.role === "admin" || user.role === "user")
    .map((user) => ({
      id: user.user_id,
      user_id: user.user_id,
      name: user.name,
    }));
  return NextResponse.json({ interviewers });
}
