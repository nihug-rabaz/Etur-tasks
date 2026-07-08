import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationService } from "@/services/authorization.service";
import { AppSettingsService } from "@/services/app-settings.service";
import { domainKeys, type DomainKey } from "@/lib/ui/domains";
import { domainTabIconRegistry, type DomainTabIconName } from "@/lib/ui/domain-tab-appearance";

const iconNames = Object.keys(domainTabIconRegistry) as DomainTabIconName[];

const updateSchema = z.object({
  slug: z.enum(domainKeys as [DomainKey, ...DomainKey[]]),
  icon: z.enum(iconNames as [DomainTabIconName, ...DomainTabIconName[]]),
});

export async function GET() {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const appearance = await new AppSettingsService().getDomainTabAppearance();
  return NextResponse.json({ appearance });
}

export async function PUT(request: Request) {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const appearance = await new AppSettingsService().setDomainTabIcon(
    parsed.data.slug,
    parsed.data.icon,
  );
  return NextResponse.json({ ok: true, appearance });
}
