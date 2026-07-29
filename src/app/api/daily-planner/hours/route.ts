import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationService } from "@/services/authorization.service";
import { ProfileService } from "@/services/profile.service";

const updateSchema = z.object({
  hourStart: z.number().int().min(0).max(23),
  hourEnd: z.number().int().min(0).max(23),
  slotMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]).optional(),
});

export async function GET() {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile.is_approved) {
    return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });
  }

  const settings = await new ProfileService().getDailyPlanHours(profile.id);
  return NextResponse.json(settings);
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

  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const settings = await new ProfileService().setDailyPlanHours(
    profile.id,
    parsed.data.hourStart,
    parsed.data.hourEnd,
    parsed.data.slotMinutes,
  );
  return NextResponse.json(settings);
}
