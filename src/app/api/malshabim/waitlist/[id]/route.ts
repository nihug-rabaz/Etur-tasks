import { NextResponse } from "next/server";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";
import { MalshabimWaitlistService } from "@/modules/malshabim/services/waitlist.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new MalshabimAccessService().requireMalshabimAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const entry = await new MalshabimWaitlistService().getById(id);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ entry, role: access.role });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new MalshabimAccessService().requireMalshabimAccess("user");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const deleted = await new MalshabimWaitlistService().delete(id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
