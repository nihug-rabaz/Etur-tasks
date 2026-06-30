import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveProfileEditAccess } from "@/lib/profile/access";
import { isRenderableAvatarUrl } from "@/lib/images/avatar";
import { serializeProfile } from "@/lib/profile/serialize";
import { ProfileService } from "@/services/profile.service";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  avatar: z.string().nullable().optional(),
});

export async function GET(_: Request, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  const access = await resolveProfileEditAccess(userId);
  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: access.status });
  }

  const profileService = new ProfileService();
  const profile = await profileService.getById(userId);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json(serializeProfile(profile));
}

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  const access = await resolveProfileEditAccess(userId);
  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: access.status });
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
    const updated = await profileService.updateProfile(userId, parsed.data);
    return NextResponse.json(serializeProfile(updated));
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
}
