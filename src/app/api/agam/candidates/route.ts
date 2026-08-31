import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";

export async function GET(request: Request) {
  const access = await new AgamAccessService().requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const url = new URL(request.url);
  const archived = url.searchParams.get("archived") === "1";
  const unassigned = url.searchParams.get("unassigned") === "1";
  if (archived && !new AgamAccessService().canRamad(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const service = new AgamCandidateService();
  const candidates = unassigned ? await service.listUnassigned() : await service.list(archived);
  return NextResponse.json({
    candidates,
    role: access.role,
    currentUserId: access.profile.id,
  });
}

const createSchema = z.object({
  fullName: z.string().min(2),
  personalNumber: z.string().min(2),
  phone: z.string().optional().nullable(),
  cycleId: z.string().uuid().optional().nullable(),
  command: z.string().optional().nullable(),
  directCommanderName: z.string().optional().nullable(),
  gaps: z.string().optional().nullable(),
  planningIndex: z.number().int().optional().nullable(),
  dapar: z.number().int().optional().nullable(),
  rankColor: z.enum(["green", "orange", "red"]).optional().nullable(),
  needsSakmar: z.boolean().optional().nullable(),
  mabdakApproval: z.boolean().optional().nullable(),
  medicalIssue: z.boolean().optional().nullable(),
  internetTest: z.boolean().optional().nullable(),
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
  const service = new AgamCandidateService();
  const existing = await service.findByPersonalNumber(parsed.data.personalNumber);
  if (existing) {
    return NextResponse.json({ error: "מספר אישי כבר קיים במערכת" }, { status: 409 });
  }
  const candidate = await service.create({
    full_name: parsed.data.fullName,
    personal_number: parsed.data.personalNumber,
    phone: parsed.data.phone,
    command: parsed.data.command,
    direct_commander_name: parsed.data.directCommanderName,
    gaps: parsed.data.gaps,
    planning_index: parsed.data.planningIndex,
    dapar: parsed.data.dapar,
    rank_color: parsed.data.rankColor,
    needs_sakmar: parsed.data.needsSakmar,
    mabdak_approval: parsed.data.mabdakApproval,
    medical_issue: parsed.data.medicalIssue,
    internet_test: parsed.data.internetTest,
    created_by_id: access.profile.id,
    cycle_id: parsed.data.cycleId,
  });
  await service.addTimeline({
    candidate_id: candidate.id,
    event_type: "note",
    title: "נוצר מועמד על ידי הצוות",
    actor_name: access.profile.name,
  });
  return NextResponse.json({ candidate }, { status: 201 });
}

