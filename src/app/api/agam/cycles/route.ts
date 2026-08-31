import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCycleService } from "@/modules/agam/services/cycle.service";

export async function GET(request: Request) {
  const access = await new AgamAccessService().requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const archived = new URL(request.url).searchParams.get("archived") === "1";
  const cycles = await new AgamCycleService().list(archived);
  return NextResponse.json({ cycles, role: access.role });
}

const createSchema = z.object({
  name: z.string().min(2),
  cycleDate: z.string().min(4),
  cohortYear: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const accessService = new AgamAccessService();
  const access = await accessService.requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!accessService.canEvaluate(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }
  const cycle = await new AgamCycleService().create({
    name: parsed.data.name,
    cycle_date: parsed.data.cycleDate,
    cohort_year: parsed.data.cohortYear,
    notes: parsed.data.notes,
    created_by_id: access.profile.id,
  });
  return NextResponse.json({ cycle }, { status: 201 });
}
