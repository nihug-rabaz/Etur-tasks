import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamTimelineTemplateService } from "@/modules/agam/services/timeline-template.service";

const eventTypeSchema = z.enum([
  "hasbara",
  "selection_day",
  "prep_day",
  "smach",
  "mabdak",
  "bahad1",
  "general",
]);

const templateSchema = z.object({
  title: z.string().min(1),
  eventType: eventTypeSchema.default("general"),
  dayOffset: z.number().int().min(-365).max(365).default(0),
  notes: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

const patchSchema = templateSchema.partial();

type ManageResult =
  | { error: { error: string; status: number } }
  | { access: Exclude<Awaited<ReturnType<AgamAccessService["requireAgamAccess"]>>, { error: unknown }> };

async function requireManage(): Promise<ManageResult> {
  const accessService = new AgamAccessService();
  const access = await accessService.requireAgamAccess();
  if ("error" in access) {
    return { error: { error: String(access.error), status: access.status ?? 401 } };
  }
  if (!accessService.canEvaluate(access.role)) {
    return { error: { error: "Forbidden", status: 403 } };
  }
  return { access };
}

export async function GET() {
  const access = await new AgamAccessService().requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const templates = await new AgamTimelineTemplateService().list();
  return NextResponse.json({ templates, role: access.role });
}

export async function POST(request: Request) {
  const authorized = await requireManage();
  if ("error" in authorized) {
    return NextResponse.json(
      { error: authorized.error.error },
      { status: authorized.error.status },
    );
  }
  const parsed = templateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const template = await new AgamTimelineTemplateService().create({
    title: parsed.data.title,
    event_type: parsed.data.eventType,
    day_offset: parsed.data.dayOffset,
    notes: parsed.data.notes,
    sort_order: parsed.data.sortOrder ?? parsed.data.dayOffset,
    created_by_id: authorized.access.profile.id,
  });
  return NextResponse.json({ template }, { status: 201 });
}

export async function PATCH(request: Request) {
  const authorized = await requireManage();
  if ("error" in authorized) {
    return NextResponse.json(
      { error: authorized.error.error },
      { status: authorized.error.status },
    );
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  try {
    const template = await new AgamTimelineTemplateService().update(id, {
      title: parsed.data.title,
      event_type: parsed.data.eventType,
      day_offset: parsed.data.dayOffset,
      notes: parsed.data.notes,
      sort_order: parsed.data.sortOrder,
    });
    return NextResponse.json({ template });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(request: Request) {
  const authorized = await requireManage();
  if ("error" in authorized) {
    return NextResponse.json(
      { error: authorized.error.error },
      { status: authorized.error.status },
    );
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }
  await new AgamTimelineTemplateService().delete(id);
  return NextResponse.json({ ok: true });
}
