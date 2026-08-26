import { NextResponse } from "next/server";
import { z } from "zod";
import { DovrutAccessService } from "@/modules/dovrut/services/access.service";
import { DovrutCampaignService } from "@/modules/dovrut/services/campaign.service";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["active", "completed", "on_hold", "draft"]).optional(),
  restore: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new DovrutAccessService().requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const campaign = await new DovrutCampaignService().getById(id);
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ campaign });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const accessService = new DovrutAccessService();
  const access = await accessService.requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!accessService.canEditContent(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const service = new DovrutCampaignService();
  if (parsed.data.restore) {
    const ok = await service.restore(id);
    if (!ok) return NextResponse.json({ error: "Not found or restore window expired" }, { status: 404 });
    const restored = await service.getById(id);
    return NextResponse.json({ campaign: restored });
  }
  const campaign = await service.update(id, {
    name: parsed.data.name,
    description: parsed.data.description,
    status: parsed.data.status,
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ campaign });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const accessService = new DovrutAccessService();
  const access = await accessService.requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { searchParams } = new URL(request.url);
  const purge = searchParams.get("purge") === "1";
  if (purge && !accessService.canDelete(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!purge && !accessService.canEditContent(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  const service = new DovrutCampaignService();
  const ok = purge ? await service.purge(id) : await service.softDelete(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
