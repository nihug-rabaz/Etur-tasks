import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DEFAULT_STAGE,
  isPipelineOutcome,
  isPipelineStage,
} from "@/modules/nagadim/lib/stages";
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

export async function POST(request: Request) {
  const access = await new NagadimAccessService().requireNagadimAccess("user");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }
  const fullName = parsed.data.full_name.trim();
  if (!fullName) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }
  if (
    parsed.data.pipeline_outcome != null &&
    parsed.data.pipeline_outcome !== "" &&
    !isPipelineOutcome(parsed.data.pipeline_outcome)
  ) {
    return NextResponse.json({ error: "תוצאת גיוס לא תקינה" }, { status: 400 });
  }
  if (parsed.data.current_stage != null && !isPipelineStage(parsed.data.current_stage)) {
    return NextResponse.json({ error: "שלב לא תקין" }, { status: 400 });
  }
  const stage =
    parsed.data.current_stage && isPipelineStage(parsed.data.current_stage)
      ? parsed.data.current_stage
      : DEFAULT_STAGE;
  const candidate = await new NagadimCandidateService().create({
    full_name: fullName,
    phone: parsed.data.phone ?? null,
    id_number: parsed.data.id_number ?? null,
    personal_number: parsed.data.personal_number ?? null,
    family_status: parsed.data.family_status ?? null,
    children_count: parsed.data.children_count ?? null,
    residence: parsed.data.residence ?? null,
    notes: parsed.data.notes ?? null,
    current_stage: stage,
    pipeline_outcome:
      parsed.data.pipeline_outcome && isPipelineOutcome(parsed.data.pipeline_outcome)
        ? parsed.data.pipeline_outcome
        : null,
    created_by: access.profile.id,
  });
  return NextResponse.json({ candidate }, { status: 201 });
}
