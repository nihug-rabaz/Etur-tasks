import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationService } from "@/services/authorization.service";
import { AppSettingsService } from "@/services/app-settings.service";
import { domainKeys, type DomainKey } from "@/lib/ui/domains";
import {
  TAB_ICON_MAX_BYTES,
  validateTabIconByteSize,
  validateTabIconMimeType,
} from "@/lib/images/tab-icon";

const slugSchema = z.enum(domainKeys as [DomainKey, ...DomainKey[]]);

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await context.params;
  const parsedSlug = slugSchema.safeParse(slug);
  if (!parsedSlug.success) {
    return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!validateTabIconMimeType(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (!validateTabIconByteSize(file.size)) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  if (!validateTabIconByteSize(buffer.byteLength)) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const imageUrl = `data:${file.type};base64,${Buffer.from(buffer).toString("base64")}`;
  if (imageUrl.length > TAB_ICON_MAX_BYTES * 1.4) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const appearance = await new AppSettingsService().setDomainTabImage(parsedSlug.data, imageUrl);
  return NextResponse.json({ ok: true, appearance });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await context.params;
  const parsedSlug = slugSchema.safeParse(slug);
  if (!parsedSlug.success) {
    return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
  }

  const appearance = await new AppSettingsService().setDomainTabImage(parsedSlug.data, null);
  return NextResponse.json({ ok: true, appearance });
}
