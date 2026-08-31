import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { AgamInterviewService } from "@/modules/agam/services/interview.service";
import { AgamDayEvaluationService, AgamCriterionService } from "@/modules/agam/services/evaluation.service";
import { AgamPrepDayService } from "@/modules/agam/services/prep-day.service";
import { AgamSmachService } from "@/modules/agam/services/smach.service";
import { AgamDocumentService } from "@/modules/agam/services/document.service";
import { AgamOrgSettingsService } from "@/modules/agam/services/org-settings.service";
import { AgamQuestionService } from "@/modules/agam/services/question.service";
import { AgamTaskLinkService } from "@/modules/agam/services/task-link.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new AgamAccessService().requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const candidateService = new AgamCandidateService();
  const candidate = await candidateService.getById(id);
  if (!candidate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const [interviews, evaluations, prepDays, smach, documents, timeline, tasks, org, preQuestions, interviewQuestions, criteria] =
    await Promise.all([
      new AgamInterviewService().listByCandidate(id),
      new AgamDayEvaluationService().listByCandidate(id),
      new AgamPrepDayService().listByCandidate(id),
      new AgamSmachService().listByCandidate(id),
      new AgamDocumentService().listByCandidate(id),
      candidateService.listTimeline(id),
      new AgamTaskLinkService().list({ candidateId: id }),
      new AgamOrgSettingsService().getSingleton(),
      new AgamQuestionService().listActive("pre_screening"),
      new AgamQuestionService().listActive("interview"),
      new AgamCriterionService().listActive(),
    ]);
  return NextResponse.json({
    candidate,
    interviews,
    evaluations,
    prepDays,
    smach,
    documents,
    timeline,
    tasks,
    org,
    preQuestions,
    interviewQuestions,
    criteria,
    role: access.role,
    currentUserId: access.profile.id,
    currentUserName: access.profile.name,
  });
}

const patchSchema = z.object({
  archived: z.boolean().optional(),
  status: z.enum(["pending", "passed", "not_passed"]).optional(),
  ramad_notes: z.string().optional(),
  command: z.string().nullable().optional(),
  direct_commander_name: z.string().nullable().optional(),
  gaps: z.string().nullable().optional(),
  planning_index: z.number().int().nullable().optional(),
  dapar: z.number().int().nullable().optional(),
  rank_color: z.enum(["green", "orange", "red"]).nullable().optional(),
  needs_sakmar: z.boolean().nullable().optional(),
  mabdak_approval: z.boolean().nullable().optional(),
  medical_issue: z.boolean().nullable().optional(),
  internet_test: z.boolean().nullable().optional(),
  pre_bahad1_checklist: z.record(z.string(), z.boolean()).optional(),
  questionnaire_data: z.record(z.string(), z.unknown()).optional(),
  timeline_note: z.string().optional(),
  timeline_note_category: z.string().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const accessService = new AgamAccessService();
  const access = await accessService.requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const service = new AgamCandidateService();
  const touchesRamadOnly =
    parsed.data.archived !== undefined ||
    parsed.data.status !== undefined ||
    parsed.data.ramad_notes !== undefined;
  if (touchesRamadOnly && !accessService.canRamad(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!touchesRamadOnly && !accessService.canEvaluate(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (parsed.data.archived !== undefined) {
    await service.setArchived(id, parsed.data.archived);
  }
  if (parsed.data.status) {
    await service.updateStatus(id, parsed.data.status);
    await service.addTimeline({
      candidate_id: id,
      event_type: "decision",
      title: parsed.data.status === "passed" ? "החלטה: עבר" : "החלטה: לא עבר",
      actor_name: access.profile.name,
      stage_key: "final_decision",
    });
  }
  if (parsed.data.ramad_notes !== undefined) {
    await service.updateNotes(id, parsed.data.ramad_notes);
  }
  const profilePayload = {
    command: parsed.data.command,
    direct_commander_name: parsed.data.direct_commander_name,
    gaps: parsed.data.gaps,
    planning_index: parsed.data.planning_index,
    dapar: parsed.data.dapar,
    rank_color: parsed.data.rank_color,
    needs_sakmar: parsed.data.needs_sakmar,
    mabdak_approval: parsed.data.mabdak_approval,
    medical_issue: parsed.data.medical_issue,
    internet_test: parsed.data.internet_test,
    pre_bahad1_checklist: parsed.data.pre_bahad1_checklist,
    questionnaire_data: parsed.data.questionnaire_data,
  };
  if (Object.values(profilePayload).some((value) => value !== undefined)) {
    await service.updateProfile(id, profilePayload);
  }
  if (parsed.data.timeline_note?.trim()) {
    const category = parsed.data.timeline_note_category ?? "other";
    const categoryLabels: Record<string, string> = {
      interview: "ראיונות",
      day_selection: "יום מיונים",
      preparation_day: "היום המכין",
      smach: "סמ״ח",
      other: "אחר",
    };
    await service.addTimeline({
      candidate_id: id,
      event_type: "note",
      title: `הערכת צוות חדשה - ${categoryLabels[category] ?? "אחר"}`,
      description: parsed.data.timeline_note.trim(),
      actor_name: access.profile.name,
      stage_key: category,
      created_by_id: access.profile.id,
    });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new AgamAccessService().requireAgamAccess("admin");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  await new AgamCandidateService().delete(id);
  return NextResponse.json({ ok: true });
}
