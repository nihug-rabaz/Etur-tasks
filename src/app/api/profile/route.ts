import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationService } from "@/services/authorization.service";
import { ProfileService } from "@/services/profile.service";
import { isRenderableAvatarUrl } from "@/lib/images/avatar";
import { serializeProfile } from "@/lib/profile/serialize";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  avatar: z.string().nullable().optional(),
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

  const profileService = new ProfileService();
  const fullProfile = await profileService.getById(profile.id);
  if (!fullProfile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json(serializeProfile(fullProfile));
}

export async function PATCH(request: Request) {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile.is_approved) {
    return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });
  }

  const json = await request.json();
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  if (parsed.data.avatar !== undefined && parsed.data.avatar !== null && !isRenderableAvatarUrl(parsed.data.avatar)) {
    return NextResponse.json({ error: "Invalid avatar" }, { status: 400 });
  }

  try {
    const profileService = new ProfileService();
    const updated = await profileService.updateProfile(profile.id, parsed.data);
    return NextResponse.json(serializeProfile(updated));
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
}
