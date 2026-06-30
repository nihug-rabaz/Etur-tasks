import { NextResponse } from "next/server";
import { AuthorizationService } from "@/services/authorization.service";
import { CalendarEventService } from "@/services/calendar-event.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!profile.is_approved) return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });

  const access = await authorizationService.getTaskAccessContext(profile);
  const event = await new CalendarEventService().getOne(access, id);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ event });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!profile.is_approved) return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });

  const allowed = await authorizationService.canAccessCalendarEvent(profile, id);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await new CalendarEventService().delete(id);
  return NextResponse.json({ ok: true });
}
