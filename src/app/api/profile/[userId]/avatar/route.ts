import { NextResponse } from "next/server";
import { resolveProfileEditAccess } from "@/lib/profile/access";
import {
  AVATAR_MAX_BYTES,
  bufferToAvatarDataUrl,
  validateAvatarByteSize,
  validateAvatarMimeType,
} from "@/lib/images/avatar";
import { serializeProfile } from "@/lib/profile/serialize";
import { ProfileService } from "@/services/profile.service";

export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  const access = await resolveProfileEditAccess(userId);
  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: access.status });
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
    const updated = await profileService.updateProfile(userId, { avatar });
    return NextResponse.json(serializeProfile(updated));
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 400 });
  }
}
