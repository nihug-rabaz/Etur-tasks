import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCycleService } from "@/modules/agam/services/cycle.service";

const bodySchema = z.object({
  cohortYear: z.number().int().min(2000).max(2100),
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
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }
  const service = new AgamCycleService();
  const created = await service.ensureYearbookMonths(parsed.data.cohortYear, access.profile.id);
  const cycles = (await service.list()).filter((cycle) => cycle.cohort_year === parsed.data.cohortYear);
  return NextResponse.json({ created, cycles });
}
