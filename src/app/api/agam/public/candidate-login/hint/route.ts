import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeEmail } from "@/modules/agam/lib/email";
import { normalizePhone } from "@/modules/agam/lib/phone";
import { checkRateLimit, clientIp } from "@/modules/agam/lib/rate-limit";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";

const schema = z.object({
  personalNumber: z.string().trim().min(2),
  phone: z.string().trim().min(7),
});

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const head = local.slice(0, Math.min(2, local.length));
  const tail = local.length > 4 ? local.slice(-1) : "";
  return `${head}•••${tail}@${domain}`;
}

/** Tells a registered candidate which email (masked) their file expects for Google sign-in. */
export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!checkRateLimit(`agam-candidate-login-hint:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "יותר מדי ניסיונות. נסו שוב בעוד דקה." }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "נא למלא מספר אישי וטלפון" }, { status: 400 });
  }

  const candidate = await new AgamCandidateService().findByIdentity(
    parsed.data.personalNumber,
    normalizePhone(parsed.data.phone) ?? parsed.data.phone,
  );
  if (!candidate || candidate.archived) {
    return NextResponse.json(
      { error: "לא נמצא מועמד עם הפרטים האלה. בדקו את המספר האישי והטלפון." },
      { status: 404 },
    );
  }

  const questionnaire = (candidate.questionnaire_data ?? {}) as Record<string, unknown>;
  const email = normalizeEmail(candidate.email) ?? normalizeEmail(questionnaire.civilian_email);
  return NextResponse.json({
    firstName: candidate.full_name.trim().split(/\s+/)[0] ?? "",
    maskedEmail: email ? maskEmail(email) : null,
  });
}
