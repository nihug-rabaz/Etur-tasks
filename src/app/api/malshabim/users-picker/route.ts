import { NextResponse } from "next/server";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";
import { NeonDatabase } from "@/lib/db/neon";

/** Approved system users for assigning instruction owners (אחראי לביצוע). */
export async function GET() {
  const access = await new MalshabimAccessService().requireMalshabimAccess("user");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const db = NeonDatabase.createClient();
  const users = await db<Array<{ id: string; name: string; email: string | null }>>`
    select id, name, email
    from profiles
    where is_approved = true
    order by name
  `;
  return NextResponse.json({
    users: users.map((row) => ({
      id: row.id,
      name: (row.name || "").trim() || "משתמש",
      email: row.email?.trim() || null,
    })),
  });
}
