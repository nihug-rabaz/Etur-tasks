import { NextResponse } from "next/server";
import { z } from "zod";
import { isDailyPlanToday } from "@/lib/daily-planner/hours";
import { AuthorizationService } from "@/services/authorization.service";
import { DailyPlanService } from "@/services/daily-plan.service";

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const uuidSchema = z.string().uuid();

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

  const rawIds = searchParams.get("ids") ?? "";
  const taskIds = rawIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (taskIds.length === 0) {
    return NextResponse.json({ placements: {} });
  }
  if (taskIds.length > 200) {
    return NextResponse.json({ error: "Too many ids" }, { status: 400 });
  }
  if (taskIds.some((id) => !uuidSchema.safeParse(id).success)) {
    return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
  }

  const dailyPlanService = new DailyPlanService();
  if (isDailyPlanToday(planDate)) {
    await dailyPlanService.rolloverIncompleteSlots(profile.id, planDate);
  }
  const placements = await dailyPlanService.getPlacementsForTasks(
    taskIds,
    profile.id,
    planDate,
  );

  return NextResponse.json({ planDate, placements });
}
