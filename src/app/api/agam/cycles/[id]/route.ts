import { NextResponse } from "next/server";
import { z } from "zod";
import { SCHEDULED_CANDIDATE_EXAMS, isScheduledExamId } from "@/modules/agam/lib/candidate-exams-catalog";
import { isExamOpen, israelTodayIso, resolveExamOpening } from "@/modules/agam/lib/exam-openings";
import { scheduleSchema } from "@/modules/agam/lib/cycle-schedule-schema";
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
  const today = israelTodayIso();
  const examOpenings = SCHEDULED_CANDIDATE_EXAMS.map((exam) => {
    const opening = resolveExamOpening(cycle, exam.id);
    return {
      examId: exam.id,
      title: exam.title,
      questionCount: exam.questions.length,
      ...opening,
      open: isExamOpen(opening.opensOn, today),
    };
  });
  return NextResponse.json({
    cycle,
    candidates,
    examOpenings,
    role: access.role,
    currentUserId: access.profile.id,
  });
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  cycleDate: z.string().min(4).optional(),
  cohortYear: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
  schedule: scheduleSchema.optional(),
  archived: z.boolean().optional(),
  rotateInviteSlug: z.boolean().optional(),
  assignCandidateIds: z.array(z.string().uuid()).optional(),
  unassignCandidateId: z.string().uuid().optional(),
  examOpenings: z
    .record(z.string(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable())
    .optional(),
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
  if (parsed.data.archived !== undefined) {
    if (!accessService.canRamad(access.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await service.setArchived(id, parsed.data.archived);
  }
  if (parsed.data.examOpenings) {
    const unknown = Object.keys(parsed.data.examOpenings).filter((examId) => !isScheduledExamId(examId));
    if (unknown.length > 0) {
      return NextResponse.json({ error: "מבחן לא מוכר" }, { status: 400 });
    }
    await service.setExamOpenings(id, parsed.data.examOpenings);
  }
  if (parsed.data.rotateInviteSlug) {
    if (!accessService.canRamad(access.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await service.rotateInviteSlug(id);
  }

  const cycle = await service.update(id, {
    name: parsed.data.name,
    cycle_date: parsed.data.cycleDate,
    cohort_year: parsed.data.cohortYear,
    notes: parsed.data.notes,
    schedule: parsed.data.schedule ?? undefined,
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
