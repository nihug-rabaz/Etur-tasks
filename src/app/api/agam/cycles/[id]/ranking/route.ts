import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCycleService } from "@/modules/agam/services/cycle.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new AgamAccessService().requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const service = new AgamCycleService();
  const cycle = await service.getById(id);
  if (!cycle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rows = await service.listRanking(id);
  return NextResponse.json({ cycle, rows, role: access.role });
}

const saveSchema = z.object({
  orderedIds: z.array(z.string().uuid()).max(500),
});

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const accessService = new AgamAccessService();
  const access = await accessService.requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!accessService.canEvaluate(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || new Set(parsed.data.orderedIds).size !== parsed.data.orderedIds.length) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }
  const service = new AgamCycleService();
  if (!(await service.getById(id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await service.saveRanking(id, parsed.data.orderedIds);
  return NextResponse.json({ rows: await service.listRanking(id) });
}
