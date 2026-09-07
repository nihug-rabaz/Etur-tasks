import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { AgamInterviewService } from "@/modules/agam/services/interview.service";
import { AgamQuestionService } from "@/modules/agam/services/question.service";
import { verifyPublicUploadToken } from "@/modules/agam/lib/public-upload-token";
import { checkRateLimit, clientIp } from "@/modules/agam/lib/rate-limit";
import { normalizePhone } from "@/modules/agam/lib/phone";

function authorizePortal(request: Request, candidateId: string | null) {
  if (!candidateId) return { error: "missing", status: 400 as const };
  const token = request.headers.get("x-agam-portal-token");
  if (!token || !verifyPublicUploadToken(candidateId, token)) {
    return { error: "Unauthorized", status: 401 as const };
  }
  return { candidateId };
}

export async function GET(request: Request) {
  const ip = clientIp(request);
  if (!checkRateLimit(`agam-portal-me:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "יותר מדי בקשות" }, { status: 429 });
  }
  const candidateId = new URL(request.url).searchParams.get("candidateId");
  const auth = authorizePortal(request, candidateId);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const candidate = await new AgamCandidateService().getById(auth.candidateId);
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const questions = await new AgamQuestionService().listActive("pre_screening", {
    includeStaffOnly: false,
  });
  const interviewQuestions = await new AgamQuestionService().listActive("interview");
  const interview = await new AgamInterviewService().getLatestForCandidate(auth.candidateId);
  return NextResponse.json({ candidate, questions, interviewQuestions, interview });
}

const patchSchema = z.object({
  questionnaireData: z.record(z.string(), z.unknown()),
});

export async function PATCH(request: Request) {
  const ip = clientIp(request);
  if (!checkRateLimit(`agam-portal-patch:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "יותר מדי בקשות" }, { status: 429 });
  }
  const candidateId = new URL(request.url).searchParams.get("candidateId");
  const auth = authorizePortal(request, candidateId);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const q = parsed.data.questionnaireData;
  const service = new AgamCandidateService();
  const existing = await service.getById(auth.candidateId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const candidate = await service.updateProfile(auth.candidateId, {
    full_name: typeof q.full_name === "string" && q.full_name.trim() ? q.full_name : existing.full_name,
    phone: typeof q.phone === "string" ? normalizePhone(q.phone) : existing.phone,
    command: typeof q.command === "string" ? q.command : existing.command,
    direct_commander_name:
      typeof q.direct_commander_name === "string" ? q.direct_commander_name : existing.direct_commander_name,
    direct_commander_role:
      typeof q.direct_commander_role === "string" ? q.direct_commander_role : existing.direct_commander_role,
    questionnaire_data: q,
  });
  return NextResponse.json({ candidate });
}
