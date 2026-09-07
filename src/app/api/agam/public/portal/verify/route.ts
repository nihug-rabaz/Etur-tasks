import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { createPublicUploadToken } from "@/modules/agam/lib/public-upload-token";
import { checkRateLimit, clientIp } from "@/modules/agam/lib/rate-limit";
import { normalizePhone } from "@/modules/agam/lib/phone";

const schema = z.object({
  personalNumber: z.string().min(2),
  phone: z.string().min(7),
});

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!checkRateLimit(`agam-portal-verify:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "יותר מדי בקשות" }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }
  const candidate = await new AgamCandidateService().findByIdentity(
    parsed.data.personalNumber,
    normalizePhone(parsed.data.phone) ?? parsed.data.phone,
  );
  if (!candidate) {
    return NextResponse.json({ error: "לא נמצא מועמד מתאים" }, { status: 404 });
  }
  const token = createPublicUploadToken(candidate.id);
  return NextResponse.json({ candidateId: candidate.id, token });
}
