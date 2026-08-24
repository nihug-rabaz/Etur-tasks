import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamOrgSettingsService } from "@/modules/agam/services/org-settings.service";

export async function GET() {
  const access = await new AgamAccessService().requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const settings = await new AgamOrgSettingsService().getSingleton();
  return NextResponse.json({ settings });
}

const bodySchema = z.object({
  unit_name: z.string().min(1),
  logo_url: z.string().nullable().optional(),
});

export async function PUT(request: Request) {
  const access = await new AgamAccessService().requireAgamAccess("admin");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const settings = await new AgamOrgSettingsService().upsert(
    parsed.data.unit_name,
    parsed.data.logo_url,
  );
  return NextResponse.json({ settings });
}
