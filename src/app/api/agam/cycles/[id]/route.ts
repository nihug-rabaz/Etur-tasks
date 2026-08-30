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
  const candidates = await service.listCandidates(id);
  return NextResponse.json({
    cycle,
    candidates,
    role: access.role,
  });
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  cycleDate: z.string().min(4).optional(),
  notes: z.string().nullable().optional(),
  assignCandidateIds: z.array(z.string().uuid()).optional(),
  unassignCandidateId: z.string().uuid().optional(),
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
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }
  const service = new AgamCycleService();
  const existing = await service.getById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.assignCandidateIds?.length) {
    await service.assignCandidates(id, parsed.data.assignCandidateIds);
  }
  if (parsed.data.unassignCandidateId) {
    await service.unassignCandidate(id, parsed.data.unassignCandidateId);
  }

  const cycle = await service.update(id, {
    name: parsed.data.name,
    cycle_date: parsed.data.cycleDate,
    notes: parsed.data.notes,
  });
  const candidates = await service.listCandidates(id);
  return NextResponse.json({ cycle, candidates });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const accessService = new AgamAccessService();
  const access = await accessService.requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!accessService.canRamad(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  const ok = await new AgamCycleService().delete(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
