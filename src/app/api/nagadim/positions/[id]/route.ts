import { NextResponse } from "next/server";
import { z } from "zod";
import { isGapStatus } from "@/modules/nagadim/lib/decisions";
import { NagadimAccessService } from "@/modules/nagadim/services/access.service";
import { NagadimPositionService } from "@/modules/nagadim/services/position.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new NagadimAccessService().requireNagadimAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const position = await new NagadimPositionService().getById(id);
  if (!position) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    position,
    role: access.role,
    currentUserId: access.profile.id,
  });
}

const patchSchema = z.object({
  command: z.string().optional().nullable(),
  division: z.string().optional().nullable(),
  brigade: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  activity_level: z.string().optional().nullable(),
  gap_status: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new NagadimAccessService().requireNagadimAccess("user");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  if (parsed.data.gap_status != null && !isGapStatus(parsed.data.gap_status)) {
    return NextResponse.json({ error: "Invalid gap_status" }, { status: 400 });
  }
  const position = await new NagadimPositionService().update(id, {
    ...parsed.data,
    gap_status:
      parsed.data.gap_status && isGapStatus(parsed.data.gap_status)
        ? parsed.data.gap_status
        : undefined,
  });
  if (!position) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ position });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new NagadimAccessService().requireNagadimAccess("admin");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const deleted = await new NagadimPositionService().delete(id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
