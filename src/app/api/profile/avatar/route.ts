import { NextResponse } from "next/server";
import { AuthorizationService } from "@/services/authorization.service";
import { ProfileService } from "@/services/profile.service";
import {
  AVATAR_MAX_BYTES,
  bufferToAvatarDataUrl,
  validateAvatarByteSize,
  validateAvatarMimeType,
} from "@/lib/images/avatar";

export async function POST(request: Request) {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile.is_approved) {
    return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!validateAvatarMimeType(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (!validateAvatarByteSize(file.size)) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  if (!validateAvatarByteSize(buffer.byteLength)) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const avatar = bufferToAvatarDataUrl(buffer, file.type);
  if (avatar.length > AVATAR_MAX_BYTES * 1.4) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  try {
    const profileService = new ProfileService();
    const updated = await profileService.updateProfile(profile.id, { avatar });
    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email ?? null,
      avatar: updated.avatar,
      role: updated.role,
    });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 400 });
  }
}
