import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { checkRateLimit } from "@/modules/agam/lib/rate-limit";

const applySchema = z.object({
  fullName: z.string().min(2),
  personalNumber: z.string().min(2),
  phone: z.string().optional().nullable(),
  questionnaireData: z.record(z.string(), z.unknown()).optional().nullable(),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "anon";
  if (!checkRateLimit(`agam-apply:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "יותר מדי בקשות" }, { status: 429 });
  }
  try {
    const parsed = applySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
    }
    const service = new AgamCandidateService();
    const candidate = await service.create({
      full_name: parsed.data.fullName,
      personal_number: parsed.data.personalNumber,
      phone: parsed.data.phone,
      questionnaire_data: parsed.data.questionnaireData,
    });
    await service.addTimeline({
      candidate_id: candidate.id,
      event_type: "questionnaire",
      title: "הוגש שאלון מקדים",
      actor_name: candidate.full_name,
    });
    return NextResponse.json({ id: candidate.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "שמירה נכשלה" }, { status: 500 });
  }
}
