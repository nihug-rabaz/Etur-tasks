import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationService } from "@/services/authorization.service";
import { ProfileService } from "@/services/profile.service";
import { fontScaleOptions, normalizeFontScalePreset, type FontScalePreset } from "@/lib/ui/font-scale";

const presetValues = fontScaleOptions.map((option) => option.preset) as [
  FontScalePreset,
  ...FontScalePreset[],
];

const updateSchema = z.object({
  preset: z.enum(presetValues),
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

  const fontScale = await new ProfileService().getFontScale(profile.id);
  return NextResponse.json(fontScale);
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

  const preset = normalizeFontScalePreset(parsed.data.preset);
  const fontScale = await new ProfileService().setFontScale(profile.id, preset);
  return NextResponse.json(fontScale);
}
