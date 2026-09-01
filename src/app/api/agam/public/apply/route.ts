import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { checkRateLimit, clientIp } from "@/modules/agam/lib/rate-limit";
import { normalizePhone } from "@/modules/agam/lib/phone";

const applySchema = z.object({
  fullName: z.string().min(2),
  personalNumber: z.string().min(2),
  phone: z.string().optional().nullable(),
  questionnaireData: z.record(z.string(), z.unknown()).optional().nullable(),
});

function boolFromQuestion(value: unknown): boolean | null {
  if (value === true || value === "כן" || value === "yes") return true;
  if (value === false || value === "לא" || value === "no") return false;
  return null;
}

function numberFromQuestion(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!checkRateLimit(`agam-apply:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "יותר מדי בקשות" }, { status: 429 });
  }
  try {
    const parsed = applySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
    }
    const service = new AgamCandidateService();
    const existing = await service.findByPersonalNumber(parsed.data.personalNumber);
    if (existing) {
      return NextResponse.json({ error: "מספר אישי כבר קיים במערכת" }, { status: 409 });
    }
    const questionnaire = parsed.data.questionnaireData ?? {};
    const candidate = await service.create({
      full_name: parsed.data.fullName,
      personal_number: parsed.data.personalNumber,
      phone: normalizePhone(parsed.data.phone),
      command: typeof questionnaire.command === "string" ? questionnaire.command : null,
      direct_commander_name:
        typeof questionnaire.direct_commander_name === "string" ? questionnaire.direct_commander_name : null,
      planning_index: numberFromQuestion(questionnaire.planning_index),
      dapar: numberFromQuestion(questionnaire.dapar),
      needs_sakmar: boolFromQuestion(questionnaire.needs_sakmar),
      mabdak_approval: boolFromQuestion(questionnaire.mabdak_approval),
      medical_issue: boolFromQuestion(questionnaire.medical_issue),
      internet_test: boolFromQuestion(questionnaire.internet_test),
      questionnaire_data: questionnaire,
    });
    await service.addTimeline({
      candidate_id: candidate.id,
      event_type: "questionnaire",
      title: "הוגש שאלון מקדים",
      actor_name: candidate.full_name,
      stage_key: "day_selection",
    });
    return NextResponse.json({ ok: true, id: candidate.id });
  } catch {
    return NextResponse.json({ error: "שליחה נכשלה" }, { status: 500 });
  }
}
