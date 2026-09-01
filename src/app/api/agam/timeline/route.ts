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

async function authorize(request: Request) {
  const accessService = new AgamAccessService();
  const access = await accessService.requireAgamAccess();
  if ("error" in access) return { error: access };

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return { error: { error: "missing", status: 400 } };

  const event = await new AgamTimelineEventService().getById(id);
  if (!event) return { error: { error: "Not found", status: 404 } };

  const canChange = accessService.canRamad(access.role) || event.created_by_id === access.profile.id;
  if (!canChange) return { error: { error: "Forbidden", status: 403 } };

  return { access, event };
}

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

function rejectAuth(result: { error: { error: string; status: number } }) {
  return NextResponse.json({ error: result.error.error }, { status: result.error.status });
}

export async function DELETE(request: Request) {
  const authorized = await authorize(request);
  if ("error" in authorized && authorized.error) {
    return rejectAuth(authorized as { error: { error: string; status: number } });
  }
  await new AgamTimelineEventService().delete(authorized.event.id);
  return NextResponse.json({ ok: true });
}

const patchSchema = z.object({
  title: z.string().min(1),
  eventDate: z.string().min(4),
  eventType: z.enum(["hasbara", "selection_day", "prep_day", "smach", "mabdak", "bahad1", "general"]).default("general"),
  notes: z.string().optional().nullable(),
});

export async function PATCH(request: Request) {
  const authorized = await authorize(request);
  if ("error" in authorized && authorized.error) {
    return rejectAuth(authorized as { error: { error: string; status: number } });
  }
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const updated = await new AgamTimelineEventService().update(authorized.event.id, {
    title: parsed.data.title,
    event_date: parsed.data.eventDate,
    event_type: parsed.data.eventType,
    notes: parsed.data.notes,
  });
  return NextResponse.json({ event: updated });
}
