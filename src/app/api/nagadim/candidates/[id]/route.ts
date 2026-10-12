import { NextResponse } from "next/server";
import { z } from "zod";
import { isPipelineOutcome, isPipelineStage } from "@/modules/nagadim/lib/stages";
import { NagadimAccessService } from "@/modules/nagadim/services/access.service";
import { NagadimCandidateService } from "@/modules/nagadim/services/candidate.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new NagadimAccessService().requireNagadimAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const candidate = await new NagadimCandidateService().getById(id);
  if (!candidate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    candidate,
    role: access.role,
    currentUserId: access.profile.id,
  });
}

const patchSchema = z.object({
  full_name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  id_number: z.string().optional().nullable(),
  personal_number: z.string().optional().nullable(),
  family_status: z.string().optional().nullable(),
  children_count: z.number().int().min(0).optional().nullable(),
  residence: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  current_stage: z.string().optional().nullable(),
  pipeline_outcome: z.string().optional().nullable(),
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
  if (parsed.data.full_name !== undefined && !parsed.data.full_name.trim()) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }
  if (parsed.data.current_stage != null && !isPipelineStage(parsed.data.current_stage)) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  }
  if (
    parsed.data.pipeline_outcome != null &&
    parsed.data.pipeline_outcome !== "" &&
    !isPipelineOutcome(parsed.data.pipeline_outcome)
  ) {
    return NextResponse.json({ error: "Invalid pipeline outcome" }, { status: 400 });
  }
  const candidate = await new NagadimCandidateService().update(id, {
    full_name: parsed.data.full_name?.trim(),
    phone: parsed.data.phone,
    id_number: parsed.data.id_number,
    personal_number: parsed.data.personal_number,
    family_status: parsed.data.family_status,
    children_count: parsed.data.children_count,
    residence: parsed.data.residence,
    notes: parsed.data.notes,
    current_stage: parsed.data.current_stage ?? undefined,
    pipeline_outcome:
      parsed.data.pipeline_outcome === undefined
        ? undefined
        : parsed.data.pipeline_outcome === "" || parsed.data.pipeline_outcome === null
          ? null
          : isPipelineOutcome(parsed.data.pipeline_outcome)
            ? parsed.data.pipeline_outcome
            : undefined,
  });
  if (!candidate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ candidate });
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
  const deleted = await new NagadimCandidateService().delete(id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
