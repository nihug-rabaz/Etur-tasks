import { NextResponse } from "next/server";
import { z } from "zod";
import { DovrutAccessService } from "@/modules/dovrut/services/access.service";
import { DovrutWorkflowSettingsService } from "@/modules/dovrut/services/workflow-settings.service";

const phonesSchema = z
  .object({
    branch_head: z.string().optional(),
    deputy_commander: z.string().optional(),
    chief_rabbi: z.string().optional(),
    idf_spokesperson: z.string().optional(),
  })
  .optional();

const putSchema = z.object({
  phones: phonesSchema,
  news_keywords: z.array(z.string()).optional(),
});

export async function GET() {
  const access = await new DovrutAccessService().requireDovrutAccess("admin");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const settings = await new DovrutWorkflowSettingsService().get();
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const access = await new DovrutAccessService().requireDovrutAccess("admin");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const body = await request.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const settings = await new DovrutWorkflowSettingsService().update({
    phones: parsed.data.phones,
    news_keywords: parsed.data.news_keywords,
  });
  return NextResponse.json({ settings });
}
