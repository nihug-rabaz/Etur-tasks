import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { AgamInterviewService } from "@/modules/agam/services/interview.service";
import { AgamDayEvaluationService } from "@/modules/agam/services/evaluation.service";
import { AgamPrepDayService } from "@/modules/agam/services/prep-day.service";
import { AgamSmachService } from "@/modules/agam/services/smach.service";
import { AgamDocumentService } from "@/modules/agam/services/document.service";
import { AgamOrgSettingsService } from "@/modules/agam/services/org-settings.service";
import { AgamQuestionService } from "@/modules/agam/services/question.service";

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
  const [interviews, evaluations, prepDays, smach, documents, timeline, org, preQuestions] =
    await Promise.all([
      new AgamInterviewService().listByCandidate(id),
      new AgamDayEvaluationService().listByCandidate(id),
      new AgamPrepDayService().listByCandidate(id),
      new AgamSmachService().listByCandidate(id),
      new AgamDocumentService().listByCandidate(id),
      candidateService.listTimeline(id),
      new AgamOrgSettingsService().getSingleton(),
      new AgamQuestionService().listActive("pre_screening"),
    ]);
  return NextResponse.json({
    candidate,
    interviews,
    evaluations,
    prepDays,
    smach,
    documents,
    timeline,
    org,
    preQuestions,
    role: access.role,
    currentUserId: access.profile.id,
    currentUserName: access.profile.name,
  });
}

const patchSchema = z.object({
  archived: z.boolean().optional(),
  status: z.enum(["pending", "passed", "not_passed"]).optional(),
  ramad_notes: z.string().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const accessService = new AgamAccessService();
  const access = await accessService.requireAgamAccess("ramad");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const service = new AgamCandidateService();
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
