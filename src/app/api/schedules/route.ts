import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationService } from "@/services/authorization.service";
import { CalendarEventService } from "@/services/calendar-event.service";
import { NotificationService } from "@/services/notification.service";
import { NeonDatabase } from "@/lib/db/neon";

const scheduleSchema = z.object({
  title: z.string().min(1),
  subtopicId: z.string().uuid(),
  participantIds: z.array(z.string().uuid()).optional().default([]),
  startsAt: z.string(),
  endsAt: z.string().nullable().optional(),
  allDay: z.boolean().optional().default(false),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
});

const schedulePatchSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  subtopicId: z.string().uuid().optional(),
  participantIds: z.array(z.string().uuid()).optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().nullable().optional(),
  allDay: z.boolean().optional(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!profile.is_approved) return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });

  const parsed = scheduleSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  const payload = parsed.data;

  if (profile.role !== "admin") {
    const allowed = await authorizationService.canAccessSubtopic(profile.id, payload.subtopicId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = new CalendarEventService();
  const eventId = await service.create({
    title: payload.title,
    description: payload.description ?? null,
    subtopicId: payload.subtopicId,
    location: payload.location ?? null,
    startsAt: payload.startsAt,
    endsAt: payload.endsAt ?? null,
    allDay: payload.allDay,
    participantIds: payload.participantIds,
    createdBy: profile.id,
  });

  const db = NeonDatabase.createClient();
  const subtopicRows = await db<Array<{ name: string }>>`
    select name from subtopics where id = ${payload.subtopicId} limit 1
  `;
  await new NotificationService().notifyScheduleCreated({
    eventId,
    title: payload.title,
    subtopic: subtopicRows[0]?.name ?? "לא ידוע",
    startsAt: payload.startsAt,
    endsAt: payload.endsAt ?? null,
    allDay: payload.allDay,
    location: payload.location ?? null,
    participantIds: payload.participantIds,
    creatorId: profile.id,
  });

  return NextResponse.json({ id: eventId });
}

export async function PATCH(request: Request) {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!profile.is_approved) return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });

  const parsed = schedulePatchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  const payload = parsed.data;

  const allowed = await authorizationService.canAccessCalendarEvent(profile, payload.id);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await new CalendarEventService().update(payload);
  return NextResponse.json({ ok: true });
}
