import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { AgamInterviewService } from "@/modules/agam/services/interview.service";
import { AgamQuestionService } from "@/modules/agam/services/question.service";

export async function GET(request: Request) {
  const access = await new AgamAccessService().requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { searchParams } = new URL(request.url);
  const candidateId = searchParams.get("candidateId");
  const interviewId = searchParams.get("interviewId");
  if (!candidateId) {
    return NextResponse.json({ error: "missing" }, { status: 400 });
  }
  const questions = await new AgamQuestionService().listActive("interview");
  const interview = interviewId ? await new AgamInterviewService().getById(interviewId) : null;
  return NextResponse.json({ questions, interview, currentUserId: access.profile.id });
}

const bodySchema = z.object({
  candidateId: z.string().uuid(),
  interviewId: z.string().uuid().optional(),
  interviewData: z.record(z.string(), z.unknown()),
  evaluatorAssessment: z.string(),
  recommendation: z.enum(["ממליץ", "ממליץ בהסתייגות", "לא ממליץ"]).nullable(),
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
  const interviewService = new AgamInterviewService();
  if (parsed.data.interviewId) {
    await interviewService.update(parsed.data.interviewId, {
      interview_data: parsed.data.interviewData,
      evaluator_assessment: parsed.data.evaluatorAssessment,
      recommendation: parsed.data.recommendation,
    });
  } else {
    await interviewService.create({
      candidate_id: parsed.data.candidateId,
      evaluator_id: access.profile.id,
      evaluator_name: access.profile.name,
      interview_data: parsed.data.interviewData,
      evaluator_assessment: parsed.data.evaluatorAssessment,
      recommendation: parsed.data.recommendation,
    });
  }
  await new AgamCandidateService().addTimeline({
    candidate_id: parsed.data.candidateId,
    event_type: "interview",
    title: "נשמר ראיון",
    actor_name: access.profile.name,
    stage_key: "day_selection",
  });
  return NextResponse.json({ ok: true });
}
