import { NextResponse } from "next/server";
import { z } from "zod";
import { NagadimAccessService } from "@/modules/nagadim/services/access.service";
import { ModuleRoleService } from "@/shared/services/module-role.service";
import { UserService } from "@/services/user.service";

const postSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "user", "viewer"]),
});

export async function GET() {
  const access = await new NagadimAccessService().requireNagadimAccess("admin");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const moduleUsers = await new ModuleRoleService().listModuleUsers("nagadim");
  const allUsers = await new UserService().getUsers();
  return NextResponse.json({ moduleUsers, allUsers });
}

export async function POST(request: Request) {
  const access = await new NagadimAccessService().requireNagadimAccess("admin");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  if (parsed.data.userId === access.profile.id) {
    return NextResponse.json({ error: "Cannot change your own module role" }, { status: 400 });
  }
  await new ModuleRoleService().setRole(parsed.data.userId, "nagadim", parsed.data.role);
  return NextResponse.json({ ok: true });
}
