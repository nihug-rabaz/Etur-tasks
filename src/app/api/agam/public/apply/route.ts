import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { AgamCycleService } from "@/modules/agam/services/cycle.service";
import { checkRateLimit, clientIp } from "@/modules/agam/lib/rate-limit";
import { normalizePhone } from "@/modules/agam/lib/phone";

const applySchema = z.object({
  fullName: z.string().min(2),
  personalNumber: z.string().min(2),
  phone: z.string().optional().nullable(),
  questionnaireData: z.record(z.string(), z.unknown()).optional().nullable(),
  inviteSlug: z.string().min(4).max(64).optional().nullable(),
});

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

    let cycleId: string | null = null;
    let cycleName: string | null = null;
    if (parsed.data.inviteSlug) {
      const cycle = await new AgamCycleService().getByInviteSlug(parsed.data.inviteSlug);
      if (!cycle || cycle.archived) {
        return NextResponse.json({ error: "קישור ההרשמה אינו פעיל" }, { status: 404 });
      }
      cycleId = cycle.id;
      cycleName = cycle.name;
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
      planning_index: null,
      dapar: null,
      needs_sakmar: null,
      mabdak_approval: null,
      medical_issue: null,
      internet_test: null,
      questionnaire_data: questionnaire,
      cycle_id: cycleId,
    });
    await service.addTimeline({
      candidate_id: candidate.id,
      event_type: "questionnaire",
      title: cycleName ? `הוגש שאלון מקדים · ${cycleName}` : "הוגש שאלון מקדים",
      actor_name: candidate.full_name,
      stage_key: "day_selection",
    });
    return NextResponse.json({ ok: true, id: candidate.id, cycleId });
  } catch {
    return NextResponse.json({ error: "שליחה נכשלה" }, { status: 500 });
  }
}
