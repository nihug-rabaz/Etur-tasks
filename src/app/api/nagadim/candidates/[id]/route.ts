import { NextResponse } from "next/server";
import { z } from "zod";
import { isPipelineStage } from "@/modules/nagadim/lib/stages";
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
  notes: z.string().optional().nullable(),
  current_stage: z.string().optional().nullable(),
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
  if (parsed.data.current_stage != null && !isPipelineStage(parsed.data.current_stage)) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  }
  const candidate = await new NagadimCandidateService().update(id, {
    full_name: parsed.data.full_name,
    notes: parsed.data.notes,
    current_stage: parsed.data.current_stage ?? undefined,
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
