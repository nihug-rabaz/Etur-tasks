import { NextResponse } from "next/server";
import { z } from "zod";
import { isPipelineStage } from "@/modules/nagadim/lib/stages";
import { NagadimAccessService } from "@/modules/nagadim/services/access.service";
import { NagadimCandidateService } from "@/modules/nagadim/services/candidate.service";

const stageSchema = z.object({
  id: z.string().uuid().optional(),
  stage: z.string().min(1),
  person_name: z.string().optional().nullable(),
  event_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  command: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  sort_order: z.number().int().optional().nullable(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new NagadimAccessService().requireNagadimAccess("user");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const parsed = stageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isPipelineStage(parsed.data.stage)) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

  const candidate = await new NagadimCandidateService().addOrUpdateStageEvent(id, {
    id: parsed.data.id,
    stage: parsed.data.stage,
    person_name: parsed.data.person_name ?? null,
    event_date: parsed.data.event_date ?? null,
    notes: parsed.data.notes ?? null,
    command: parsed.data.command ?? null,
    unit: parsed.data.unit ?? null,
    sort_order: parsed.data.sort_order ?? 0,
  });

  if (!candidate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ candidate }, { status: parsed.data.id ? 200 : 201 });
}
