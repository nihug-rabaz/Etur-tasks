import { NextResponse } from "next/server";
import { z } from "zod";
import { isGapStatus } from "@/modules/nagadim/lib/decisions";
import { NagadimAccessService } from "@/modules/nagadim/services/access.service";
import { NagadimPositionService } from "@/modules/nagadim/services/position.service";

export async function GET(request: Request) {
  const access = await new NagadimAccessService().requireNagadimAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const url = new URL(request.url);
  const gapRaw = url.searchParams.get("gap_status");
  const gapStatus = gapRaw && isGapStatus(gapRaw) ? gapRaw : null;
  const service = new NagadimPositionService();
  const [positions, stats] = await Promise.all([
    service.list(gapStatus),
    service.stats(),
  ]);
  return NextResponse.json({
    positions,
    stats,
    role: access.role,
    currentUserId: access.profile.id,
  });
}

const createSchema = z.object({
  command: z.string().optional().nullable(),
  division: z.string().optional().nullable(),
  brigade: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  activity_level: z.string().optional().nullable(),
  gap_status: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const access = await new NagadimAccessService().requireNagadimAccess("user");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }
  if (parsed.data.gap_status != null && !isGapStatus(parsed.data.gap_status)) {
    return NextResponse.json({ error: "Invalid gap_status" }, { status: 400 });
  }
  const position = await new NagadimPositionService().create({
    command: parsed.data.command ?? null,
    division: parsed.data.division ?? null,
    brigade: parsed.data.brigade ?? null,
    unit: parsed.data.unit ?? null,
    activity_level: parsed.data.activity_level ?? null,
    gap_status: parsed.data.gap_status && isGapStatus(parsed.data.gap_status)
      ? parsed.data.gap_status
      : "open",
    notes: parsed.data.notes ?? null,
  });
  return NextResponse.json({ position }, { status: 201 });
}
