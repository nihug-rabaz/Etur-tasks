import { NextResponse } from "next/server";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";
import { ModuleRoleService } from "@/shared/services/module-role.service";

/** Approved malshabim module users for assigning instruction owners (אחראי לביצוע). */
export async function GET(request: Request) {
  const access = await new MalshabimAccessService().requireMalshabimAccess("user");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const purpose = new URL(request.url).searchParams.get("purpose");
  const moduleUsers = await new ModuleRoleService().listModuleUsers("malshabim");
  const mapped = moduleUsers
    .filter((user) => user.role === "admin" || user.role === "user")
    .map((user) => ({
      id: user.user_id,
      name: (user.name || "").trim() || "משתמש",
      email: user.email?.trim() || null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "he"));

  // purpose=instructions historically filtered by name allowlist; now all module editors.
  if (purpose && purpose !== "instructions") {
    return NextResponse.json({ users: mapped });
  }

  return NextResponse.json({ users: mapped });
}
