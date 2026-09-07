import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { AgamInterviewService } from "@/modules/agam/services/interview.service";
import { verifyPublicUploadToken } from "@/modules/agam/lib/public-upload-token";
import { checkRateLimit, clientIp } from "@/modules/agam/lib/rate-limit";

const schema = z.object({
  candidatePart: z.record(z.string(), z.unknown()),
  complete: z.boolean().default(false),
});

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!checkRateLimit(`agam-portal-interview:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "יותר מדי בקשות" }, { status: 429 });
  }
  const candidateId = new URL(request.url).searchParams.get("candidateId");
  if (!candidateId) return NextResponse.json({ error: "missing" }, { status: 400 });
  const token = request.headers.get("x-agam-portal-token");
  if (!token || !verifyPublicUploadToken(candidateId, token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const interview = await new AgamInterviewService().upsertCandidatePart(
    candidateId,
    parsed.data.candidatePart,
    parsed.data.complete,
  );
  if (parsed.data.complete) {
    const candidate = await new AgamCandidateService().getById(candidateId);
    await new AgamCandidateService().addTimeline({
      candidate_id: candidateId,
      event_type: "interview",
      title: "המועמד השלים את חלק הראיון",
      actor_name: candidate?.full_name ?? "מועמד",
      stage_key: "day_selection",
    });
  }
  return NextResponse.json({ interview });
}
