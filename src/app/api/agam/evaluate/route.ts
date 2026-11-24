import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCycleService } from "@/modules/agam/services/cycle.service";
import { AgamEvaluatorPortalService, summarizeCycle } from "@/modules/agam/services/evaluator-portal.service";
import { AgamOrgSettingsService } from "@/modules/agam/services/org-settings.service";

export async function GET() {
  const accessService = new AgamAccessService();
  const access = await accessService.requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const roster = await new AgamEvaluatorPortalService().roster(access.profile.id);
  const canManage = accessService.canRamad(access.role);
  const [cycles, settings] = canManage
    ? await Promise.all([new AgamCycleService().list(false), new AgamOrgSettingsService().getSingleton()])
    : [[], null];
  return NextResponse.json({
    ...roster,
    me: { id: access.profile.id, name: access.profile.name, role: access.role },
    canEvaluate: accessService.canEvaluate(access.role),
    canManage,
    pinnedCycleId: settings?.active_cycle_id ?? null,
    cycles: cycles.map(summarizeCycle),
  });
}

const putSchema = z.object({ cycleId: z.string().uuid().nullable() });

export async function PUT(request: Request) {
  const access = await new AgamAccessService().requireAgamAccess("ramad");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  if (parsed.data.cycleId && !(await new AgamCycleService().getById(parsed.data.cycleId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await new AgamOrgSettingsService().setActiveCycle(parsed.data.cycleId);
  return NextResponse.json({ ok: true });
}
