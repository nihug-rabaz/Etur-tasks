import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { AgamPrepDayService } from "@/modules/agam/services/prep-day.service";

const bodySchema = z.object({
  candidateId: z.string().uuid(),
  mikraScore: z.number().nullable(),
  conversationScore: z.number().nullable(),
  conversationFeedback: z.string(),
  socialDynamicsScore: z.number().nullable(),
  socialDynamicsFeedback: z.string(),
  generalImpression: z.string(),
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
  await new AgamPrepDayService().upsertMine({
    candidate_id: parsed.data.candidateId,
    evaluator_id: access.profile.id,
    evaluator_name: access.profile.name,
    mikra_score: parsed.data.mikraScore,
    conversation_score: parsed.data.conversationScore,
    conversation_feedback: parsed.data.conversationFeedback,
    social_dynamics_score: parsed.data.socialDynamicsScore,
    social_dynamics_feedback: parsed.data.socialDynamicsFeedback,
    general_impression: parsed.data.generalImpression,
  });
  await new AgamCandidateService().addTimeline({
    candidate_id: parsed.data.candidateId,
    event_type: "evaluation",
    title: "נשמרה הערכת יום מכין",
    actor_name: access.profile.name,
    stage_key: "preparation_day",
  });
  return NextResponse.json({ ok: true });
}
