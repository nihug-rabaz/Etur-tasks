import { NextResponse } from "next/server";
import { z } from "zod";
import { parseDovrutListScope } from "@/modules/dovrut/lib/record-scope";
import { DovrutAccessService } from "@/modules/dovrut/services/access.service";
import { DovrutCampaignService } from "@/modules/dovrut/services/campaign.service";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.enum(["active", "completed", "on_hold", "draft"]).optional(),
});

export async function GET(request: Request) {
  const access = await new DovrutAccessService().requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const scope = parseDovrutListScope(new URL(request.url).searchParams);
  const campaigns = await new DovrutCampaignService().list(scope === "deleted" ? "deleted" : "working");
  return NextResponse.json({ campaigns }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: Request) {
  const accessService = new DovrutAccessService();
  const access = await accessService.requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!accessService.canEditContent(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const campaign = await new DovrutCampaignService().create({
    ...parsed.data,
    created_by: access.profile.id,
  });
  return NextResponse.json({ campaign }, { status: 201 });
}
