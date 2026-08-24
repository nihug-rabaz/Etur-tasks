import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";

export async function GET(request: Request) {
  const access = await new AgamAccessService().requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const archived = new URL(request.url).searchParams.get("archived") === "1";
  if (archived && !new AgamAccessService().canRamad(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const candidates = await new AgamCandidateService().list(archived);
  return NextResponse.json({
    candidates,
    role: access.role,
    currentUserId: access.profile.id,
  });
}

const createSchema = z.object({
  fullName: z.string().min(2),
  personalNumber: z.string().min(2),
  phone: z.string().optional().nullable(),
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
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }
  const service = new AgamCandidateService();
  const existing = await service.findByPersonalNumber(parsed.data.personalNumber);
  if (existing) {
    return NextResponse.json({ error: "מספר אישי כבר קיים במערכת" }, { status: 409 });
  }
  const candidate = await service.create({
    full_name: parsed.data.fullName,
    personal_number: parsed.data.personalNumber,
    phone: parsed.data.phone,
    created_by_id: access.profile.id,
  });
  await service.addTimeline({
    candidate_id: candidate.id,
    event_type: "note",
    title: "נוצר מועמד על ידי הצוות",
    actor_name: access.profile.name,
  });
  return NextResponse.json({ candidate }, { status: 201 });
}

