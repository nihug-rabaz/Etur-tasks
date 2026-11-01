import { NextResponse } from "next/server";
import { z } from "zod";
import {
  daysBetweenDateKeys,
  localTodayKey,
  materializeTemplateEvent,
  parseTemplateEventId,
  resolveTimelineCycle,
} from "@/modules/agam/lib/cycle-timeline";
import {
  buildCycleTimelineEvents,
  materializeScheduleEvents,
  parseScheduleEventId,
} from "@/modules/agam/lib/cycle-schedule";
import { timelineEventDayKey } from "@/modules/agam/lib/timeline-events";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCycleService } from "@/modules/agam/services/cycle.service";
import { AgamTimelineEventService } from "@/modules/agam/services/timeline-event.service";
import { AgamTimelineTemplateService } from "@/modules/agam/services/timeline-template.service";

const eventTypeSchema = z.enum([
  "hasbara",
  "selection_day",
  "fitness_test",
  "prep_day",
  "theory_test",
  "smach",
  "mabdak",
  "bahad1",
  "general",
]);

const eventSchema = z.object({
  title: z.string().min(1),
  eventDate: z.string().min(4).nullable().optional(),
  eventType: eventTypeSchema.default("general"),
  notes: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  cycleId: z.string().uuid().optional().nullable(),
});

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  eventDate: z.string().min(4).nullable().optional(),
  eventType: eventTypeSchema.optional(),
  notes: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  dateOnly: z.boolean().optional(),
  cycleId: z.string().uuid().optional().nullable(),
});

async function buildTimeline(cycleId?: string | null) {
  const cycles = await new AgamCycleService().list(false);
  const cycle = resolveTimelineCycle(cycles, localTodayKey(), cycleId);
  const events = buildCycleTimelineEvents(cycle);
  return { cycle, cycles, events, role: null as string | null };
}

async function authorizeOneOff(request: Request) {
  const accessService = new AgamAccessService();
  const access = await accessService.requireAgamAccess();
  if ("error" in access) return { error: access };
  if (!accessService.canEvaluate(access.role)) {
    return { error: { error: "Forbidden", status: 403 } };
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return { error: { error: "missing", status: 400 } };

  const scheduleRef = parseScheduleEventId(id);
  if (scheduleRef) {
    return { access, schedule: scheduleRef, template: null as null, event: null as null };
  }

  const templateId = parseTemplateEventId(id);
  if (templateId) {
    const template = await new AgamTimelineTemplateService().getById(templateId);
    if (!template) return { error: { error: "Not found", status: 404 } };
    return { access, template, event: null as null, schedule: null as null };
  }

  const event = await new AgamTimelineEventService().getById(id);
  if (!event) return { error: { error: "Not found", status: 404 } };
  return { access, event, template: null as null, schedule: null as null };
}

export async function GET(request: Request) {
  const access = await new AgamAccessService().requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const url = new URL(request.url);
  const cycleId = url.searchParams.get("cycleId");
  const payload = await buildTimeline(cycleId);
  return NextResponse.json({ ...payload, role: access.role });
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
  const cycles = await new AgamCycleService().list(false);
  const cycle = resolveTimelineCycle(cycles, localTodayKey(), parsed.data.cycleId);
  const event = await new AgamTimelineEventService().create({
    title: parsed.data.title,
    event_date: parsed.data.eventDate ?? null,
    event_type: parsed.data.eventType,
    notes: parsed.data.notes,
    sort_order: parsed.data.sortOrder,
    cycle_id: cycle?.id ?? parsed.data.cycleId ?? null,
    created_by_id: access.profile.id,
  });
  return NextResponse.json({ event: { ...event, is_template: false } }, { status: 201 });
}

function rejectAuth(result: { error: { error: string; status: number } }) {
  return NextResponse.json({ error: result.error.error }, { status: result.error.status });
}

export async function DELETE(request: Request) {
  const authorized = await authorizeOneOff(request);
  if ("error" in authorized && authorized.error) {
    return rejectAuth(authorized as { error: { error: string; status: number } });
  }
  if (authorized.schedule) {
    await new AgamCycleService().setScheduleDate(authorized.schedule.cycleId, authorized.schedule.key, null);
    return NextResponse.json({ ok: true });
  }
  if (authorized.template) {
    await new AgamTimelineTemplateService().delete(authorized.template.id);
    return NextResponse.json({ ok: true });
  }
  await new AgamTimelineEventService().delete(authorized.event!.id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const authorized = await authorizeOneOff(request);
  if ("error" in authorized && authorized.error) {
    return rejectAuth(authorized as { error: { error: string; status: number } });
  }
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  if (authorized.schedule) {
    const { cycleId, key } = authorized.schedule;
    const nextDate = parsed.data.eventDate ? timelineEventDayKey(parsed.data.eventDate) : null;
    const cycle = await new AgamCycleService().setScheduleDate(cycleId, key, nextDate);
    if (!cycle) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const event = materializeScheduleEvents(cycle).find((item) => item.schedule_key === key);
    return NextResponse.json({ event });
  }

  if (authorized.template) {
    const cycles = await new AgamCycleService().list(false);
    const cycle = resolveTimelineCycle(cycles, localTodayKey(), parsed.data.cycleId);
    let dayOffset = authorized.template.day_offset;
    if (parsed.data.eventDate !== undefined && cycle) {
      const cycleDate = timelineEventDayKey(cycle.cycle_date);
      const nextDate = timelineEventDayKey(parsed.data.eventDate);
      if (cycleDate && nextDate) {
        dayOffset = daysBetweenDateKeys(cycleDate, nextDate);
      }
    }
    const updatedTemplate = await new AgamTimelineTemplateService().update(authorized.template.id, {
      title: parsed.data.title,
      event_type: parsed.data.eventType,
      notes: parsed.data.notes,
      sort_order: parsed.data.sortOrder,
      day_offset: dayOffset,
    });
    if (!cycle) {
      return NextResponse.json({ error: "אין מחזור פעיל לחישוב תאריך" }, { status: 400 });
    }
    return NextResponse.json({ event: materializeTemplateEvent(updatedTemplate, cycle) });
  }

  if (parsed.data.dateOnly) {
    const updated = await new AgamTimelineEventService().updateDate(
      authorized.event!.id,
      parsed.data.eventDate ?? null,
    );
    return NextResponse.json({ event: { ...updated, is_template: false } });
  }
  const updated = await new AgamTimelineEventService().update(authorized.event!.id, {
    title: parsed.data.title,
    event_date: parsed.data.eventDate,
    event_type: parsed.data.eventType,
    notes: parsed.data.notes,
    sort_order: parsed.data.sortOrder,
  });
  return NextResponse.json({ event: { ...updated, is_template: false } });
}
