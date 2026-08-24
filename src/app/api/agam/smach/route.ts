import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { AgamSmachService } from "@/modules/agam/services/smach.service";

const bodySchema = z.object({
  candidateId: z.string().uuid(),
  thresholdTests: z.record(z.string(), z.unknown()),
  professionalScores: z.record(z.string(), z.number()),
  professionalFeedback: z.record(z.string(), z.string()),
  weightedScore: z.number().nullable(),
  keyPoints: z.string(),
  decision: z.enum(["מומלץ", "מומלץ בהסתייגות", "לא מומלץ"]).nullable(),
  decisionReasoning: z.string(),
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
  await new AgamSmachService().upsertMine({
    candidate_id: parsed.data.candidateId,
    evaluator_id: access.profile.id,
    evaluator_name: access.profile.name,
    threshold_tests: parsed.data.thresholdTests,
    professional_scores: parsed.data.professionalScores,
    professional_feedback: parsed.data.professionalFeedback,
    weighted_score: parsed.data.weightedScore,
    key_points: parsed.data.keyPoints,
    decision: parsed.data.decision,
    decision_reasoning: parsed.data.decisionReasoning,
  });
  await new AgamCandidateService().addTimeline({
    candidate_id: parsed.data.candidateId,
    event_type: "evaluation",
    title: "נשמרה הערכת סמ״ח",
    actor_name: access.profile.name,
    stage_key: "smach",
  });
  return NextResponse.json({ ok: true });
}
