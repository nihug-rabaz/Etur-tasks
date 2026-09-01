import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { AgamCriterionService, AgamDayEvaluationService } from "@/modules/agam/services/evaluation.service";

export async function GET(request: Request) {
  const access = await new AgamAccessService().requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const evalId = new URL(request.url).searchParams.get("evalId");
  const criteria = await new AgamCriterionService().listActive();
  const evaluation = evalId ? await new AgamDayEvaluationService().getById(evalId) : null;
  return NextResponse.json({ criteria, evaluation });
}

const bodySchema = z.object({
  candidateId: z.string().uuid(),
  evalId: z.string().uuid().optional(),
  scoresData: z.record(z.string(), z.number()),
  feedbackData: z.record(z.string(), z.string()),
  finalScore: z.number().nullable(),
  finalFeedback: z.string(),
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
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const criteria = await new AgamCriterionService().listActive();
  try {
    await new AgamDayEvaluationService().save({
      id: parsed.data.evalId,
      candidate_id: parsed.data.candidateId,
      evaluator_id: access.profile.id,
      evaluator_name: access.profile.name,
      scores_data: parsed.data.scoresData,
      feedback_data: parsed.data.feedbackData,
      final_score: parsed.data.finalScore,
      final_feedback: parsed.data.finalFeedback,
      criteria,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "EVAL_NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (message === "EVAL_FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }
  await new AgamCandidateService().addTimeline({
    candidate_id: parsed.data.candidateId,
    event_type: "evaluation",
    title: "נשמרה הערכת יום מיונים",
    actor_name: access.profile.name,
    stage_key: "day_selection",
  });
  return NextResponse.json({ ok: true });
}
