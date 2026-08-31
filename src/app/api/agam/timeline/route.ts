import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamTimelineEventService } from "@/modules/agam/services/timeline-event.service";

const eventSchema = z.object({
  title: z.string().min(1),
  eventDate: z.string().min(4),
  eventType: z.enum(["hasbara", "selection_day", "prep_day", "smach", "mabdak", "bahad1", "general"]).default("general"),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const access = await new AgamAccessService().requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const events = await new AgamTimelineEventService().list();
  return NextResponse.json({ events, role: access.role });
}

export async function POST(request: Request) {
  const accessService = new AgamAccessService();
  const access = await accessService.requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!accessService.canEvaluate(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const event = await new AgamTimelineEventService().create({
    title: parsed.data.title,
    event_date: parsed.data.eventDate,
    event_type: parsed.data.eventType,
    notes: parsed.data.notes,
    created_by_id: access.profile.id,
  });
  return NextResponse.json({ event }, { status: 201 });
}

export async function DELETE(request: Request) {
  const access = await new AgamAccessService().requireAgamAccess("ramad");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing" }, { status: 400 });
  await new AgamTimelineEventService().delete(id);
  return NextResponse.json({ ok: true });
}
