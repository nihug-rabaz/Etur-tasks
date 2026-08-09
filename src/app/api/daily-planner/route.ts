import { NextResponse } from "next/server";
import { z } from "zod";
import {
  findFreeStart,
  MAX_DAILY_PLAN_TASK_DURATION,
  MIN_DAILY_PLAN_TASK_DURATION,
  normalizeTaskDuration,
  rangesOverlap,
} from "@/lib/daily-planner/hours";
import { AuthorizationService } from "@/services/authorization.service";
import { DailyPlanService } from "@/services/daily-plan.service";
import { ProfileService } from "@/services/profile.service";

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const putSchema = z.object({
  planDate: dateKeySchema,
  mode: z.enum(["slot", "list"]).optional().default("slot"),
  action: z.enum(["add", "remove", "setDone"]).optional(),
  isDone: z.boolean().optional(),
  startMinute: z.number().int().min(0).max(1439).optional(),
  previousStartMinute: z.number().int().min(0).max(1439).optional(),
  hour: z.number().int().min(0).max(23).optional(),
  durationMinutes: z
    .number()
    .int()
    .min(MIN_DAILY_PLAN_TASK_DURATION)
    .max(MAX_DAILY_PLAN_TASK_DURATION)
    .optional(),
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
  const [slots, tasks, hours] = await Promise.all([
    dailyPlanService.getSlotsForDay(profile.id, planDate),
    dailyPlanService.getAssignableTasks(access, profile.id),
    new ProfileService().getDailyPlanHours(profile.id),
  ]);

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

  const { planDate, taskId, mode } = parsed.data;
  const dailyPlanService = new DailyPlanService();

  if (mode === "list") {
    if (parsed.data.action === "setDone" && taskId) {
      const allowedDone = await authorizationService.canAccessTask(profile, taskId);
      if (!allowedDone) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (typeof parsed.data.isDone !== "boolean") {
        return NextResponse.json({ error: "isDone required" }, { status: 400 });
      }
      await dailyPlanService.setTaskDone(profile.id, planDate, taskId, parsed.data.isDone);
      return NextResponse.json({ ok: true, isDone: parsed.data.isDone });
    }

    if (parsed.data.action === "remove" && taskId) {
      const allowedRemove = await authorizationService.canAccessTask(profile, taskId);
      if (!allowedRemove) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await dailyPlanService.removeTaskFromDay(profile.id, planDate, taskId);
      return NextResponse.json({ ok: true });
    }

    if (taskId === null) {
      if (parsed.data.startMinute === undefined) {
        return NextResponse.json({ error: "startMinute or taskId required" }, { status: 400 });
      }
      await dailyPlanService.clearSlot(profile.id, planDate, parsed.data.startMinute);
      return NextResponse.json({ ok: true });
    }

    const allowedList = await authorizationService.canAccessTask(profile, taskId);
    if (!allowedList) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (parsed.data.action === "remove") {
      await dailyPlanService.removeTaskFromDay(profile.id, planDate, taskId);
      return NextResponse.json({ ok: true });
    }

    try {
      const result = await dailyPlanService.addTaskToDay(
        profile.id,
        planDate,
        taskId,
        normalizeTaskDuration(parsed.data.durationMinutes),
      );
      return NextResponse.json({
        ok: true,
        startMinute: result.startMinute,
        durationMinutes: result.durationMinutes,
      });
    } catch {
      return NextResponse.json({ error: "Day full" }, { status: 409 });
    }
  }

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
  const previousStartMinute = parsed.data.previousStartMinute;
  if (previousStartMinute !== undefined) {
    const movingSlot = existingSlots.find((slot) => slot.start_minute === previousStartMinute);
    if (!movingSlot || movingSlot.task_id !== taskId) {
      return NextResponse.json({ error: "Original slot not found" }, { status: 409 });
    }
  }
  const occupancy = existingSlots.map((slot) => ({
    start_minute: slot.start_minute,
    duration_minutes: slot.duration_minutes,
  }));

  let startMinute = parsed.data.startMinute;
  if (startMinute === undefined) {
    if (parsed.data.hour === undefined) {
      return NextResponse.json({ error: "hour or startMinute required" }, { status: 400 });
    }
    const freeStart = findFreeStart(
      parsed.data.hour * 60,
      durationMinutes,
      occupancy,
      24 * 60,
      previousStartMinute,
    );
    if (freeStart === null) {
      return NextResponse.json({ error: "No free time" }, { status: 409 });
    }
    startMinute = freeStart;
  } else {
    const resolvedStart = startMinute;
    if (resolvedStart + durationMinutes > 24 * 60) {
      return NextResponse.json({ error: "Duration exceeds day" }, { status: 400 });
    }
    const conflicts = occupancy.some(
      (slot) =>
        slot.start_minute !== previousStartMinute &&
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
    previousStartMinute,
  );
  return NextResponse.json({ ok: true, startMinute, durationMinutes });
}
