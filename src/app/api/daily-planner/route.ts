import { NextResponse } from "next/server";
import { z } from "zod";
import {
  findFreeStartInHour,
  normalizeTaskDuration,
  rangesOverlap,
} from "@/lib/daily-planner/hours";
import { AuthorizationService } from "@/services/authorization.service";
import { DailyPlanService } from "@/services/daily-plan.service";
import { ProfileService } from "@/services/profile.service";

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const putSchema = z.object({
  planDate: dateKeySchema,
  startMinute: z.number().int().min(0).max(1439).optional(),
  hour: z.number().int().min(0).max(23).optional(),
  durationMinutes: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]).optional(),
  taskId: z.string().uuid().nullable(),
});

export async function GET(request: Request) {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile.is_approved) {
    return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const planDate = searchParams.get("date");
  if (!planDate || !dateKeySchema.safeParse(planDate).success) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const access = await authorizationService.getTaskAccessContext(profile);
  const dailyPlanService = new DailyPlanService();
  const slots = await dailyPlanService.getSlotsForDay(profile.id, planDate);
  const tasks = await dailyPlanService.getAssignableTasks(access, profile.id);
  const hours = await new ProfileService().getDailyPlanHours(profile.id);

  return NextResponse.json({
    planDate,
    slots,
    tasks,
    hourStart: hours.hourStart,
    hourEnd: hours.hourEnd,
    slotMinutes: hours.slotMinutes,
  });
}

export async function PUT(request: Request) {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile.is_approved) {
    return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const { planDate, taskId } = parsed.data;
  const dailyPlanService = new DailyPlanService();

  if (taskId === null) {
    if (parsed.data.startMinute === undefined) {
      return NextResponse.json({ error: "startMinute required" }, { status: 400 });
    }
    await dailyPlanService.clearSlot(profile.id, planDate, parsed.data.startMinute);
    return NextResponse.json({ ok: true });
  }

  const allowed = await authorizationService.canAccessTask(profile, taskId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const durationMinutes = normalizeTaskDuration(parsed.data.durationMinutes);
  const existingSlots = await dailyPlanService.getSlotsForDay(profile.id, planDate);
  const occupancy = existingSlots.map((slot) => ({
    start_minute: slot.start_minute,
    duration_minutes: slot.duration_minutes,
  }));

  let startMinute = parsed.data.startMinute;
  if (startMinute === undefined) {
    if (parsed.data.hour === undefined) {
      return NextResponse.json({ error: "hour or startMinute required" }, { status: 400 });
    }
    const freeStart = findFreeStartInHour(parsed.data.hour, durationMinutes, occupancy);
    if (freeStart === null) {
      return NextResponse.json({ error: "Hour is full" }, { status: 409 });
    }
    startMinute = freeStart;
  } else {
    const resolvedStart = startMinute;
    const hour = Math.floor(resolvedStart / 60);
    const existing = existingSlots.find((slot) => slot.start_minute === resolvedStart);
    const ignore = existing ? resolvedStart : undefined;
    const hourEnd = hour * 60 + 60;
    if (resolvedStart + durationMinutes > hourEnd) {
      return NextResponse.json({ error: "Duration exceeds hour" }, { status: 400 });
    }
    const conflicts = occupancy.some(
      (slot) =>
        slot.start_minute !== ignore &&
        rangesOverlap(resolvedStart, durationMinutes, slot.start_minute, slot.duration_minutes),
    );
    if (conflicts) {
      return NextResponse.json({ error: "Slot conflict" }, { status: 409 });
    }
  }

  await dailyPlanService.assignTaskToSlot(
    profile.id,
    planDate,
    startMinute as number,
    taskId,
    durationMinutes,
  );
  return NextResponse.json({ ok: true, startMinute, durationMinutes });
}
