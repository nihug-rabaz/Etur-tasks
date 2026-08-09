import { NextResponse } from "next/server";
import { z } from "zod";
import { DovrutAccessService } from "@/modules/dovrut/services/access.service";
import { DovrutAudienceMessageService } from "@/modules/dovrut/services/audience-message.service";

const createSchema = z.object({
  audience: z.string().min(1),
  domain: z
    .enum([
      "kashrut",
      "halacha",
      "reut",
      "tipuch",
      "lehaka",
      "zuq",
      "masan",
      "agam_hachsharot",
      "logistic",
      "field",
    ])
    .nullable()
    .optional(),
  title: z.string().min(1),
  body: z.string().optional(),
});

export async function GET(request: Request) {
  const access = await new DovrutAccessService().requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { searchParams } = new URL(request.url);
  const messages = await new DovrutAudienceMessageService().list(
    searchParams.get("audience") ?? undefined,
  );
  return NextResponse.json({ messages });
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
  const message = await new DovrutAudienceMessageService().create({
    ...parsed.data,
    created_by: access.profile.id,
  });
  return NextResponse.json({ message }, { status: 201 });
}
