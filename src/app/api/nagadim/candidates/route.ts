import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_STAGE, isPipelineStage } from "@/modules/nagadim/lib/stages";
import { NagadimAccessService } from "@/modules/nagadim/services/access.service";
import { NagadimCandidateService } from "@/modules/nagadim/services/candidate.service";

export async function GET() {
  const access = await new NagadimAccessService().requireNagadimAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const candidates = await new NagadimCandidateService().list();
  return NextResponse.json({
    candidates,
    role: access.role,
    currentUserId: access.profile.id,
  });
}

const createSchema = z.object({
  full_name: z.string().min(1),
  notes: z.string().optional().nullable(),
  current_stage: z.string().optional().nullable(),
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
  const stage =
    parsed.data.current_stage && isPipelineStage(parsed.data.current_stage)
      ? parsed.data.current_stage
      : DEFAULT_STAGE;
  const candidate = await new NagadimCandidateService().create({
    full_name: parsed.data.full_name.trim(),
    notes: parsed.data.notes ?? null,
    current_stage: stage,
    created_by: access.profile.id,
  });
  return NextResponse.json({ candidate }, { status: 201 });
}
