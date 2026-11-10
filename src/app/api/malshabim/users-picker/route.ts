import { NextResponse } from "next/server";
import { isMalshabimInstructionAssigneeName } from "@/modules/malshabim/lib/instruction-assignees";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";
import { NeonDatabase } from "@/lib/db/neon";

/** Approved system users for assigning instruction owners (אחראי לביצוע). */
export async function GET(request: Request) {
  const access = await new MalshabimAccessService().requireMalshabimAccess("user");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const purpose = new URL(request.url).searchParams.get("purpose");
  const db = NeonDatabase.createClient();
  const users = await db<Array<{ id: string; name: string; email: string | null }>>`
    select id, name, email
    from profiles
    where is_approved = true
    order by name
  `;
  const mapped = users.map((row) => ({
    id: row.id,
    name: (row.name || "").trim() || "משתמש",
    email: row.email?.trim() || null,
  }));
  const filtered =
    purpose === "instructions"
      ? mapped.filter((row) => isMalshabimInstructionAssigneeName(row.name))
      : mapped;
  return NextResponse.json({ users: filtered });
}
