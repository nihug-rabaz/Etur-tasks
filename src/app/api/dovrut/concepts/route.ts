import { NextResponse } from "next/server";
import { z } from "zod";
import { DovrutAccessService } from "@/modules/dovrut/services/access.service";
import { DovrutConceptService } from "@/modules/dovrut/services/concept.service";

const createSchema = z.object({
  name: z.string().min(1),
  project_id: z.string().uuid(),
  type: z.enum(["article_interview", "social_media"]),
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
  interviewees: z.array(z.string()).optional(),
  media_outlet: z.string().nullable().optional(),
  needs_briefing: z.boolean().optional(),
  link: z.string().nullable().optional(),
  details: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  content_type: z.enum(["carousel", "video", "image", "reels", "text"]).nullable().optional(),
  draft_text: z.string().nullable().optional(),
  draft_images: z.array(z.string()).optional(),
  draft_videos: z.array(z.string()).optional(),
  partners: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  const access = await new DovrutAccessService().requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { searchParams } = new URL(request.url);
  const concepts = await new DovrutConceptService().list({
    projectId: searchParams.get("projectId") ?? undefined,
    type: (searchParams.get("type") as "article_interview" | "social_media" | null) ?? undefined,
    approvalStatus: (searchParams.get("approvalStatus") as never) ?? undefined,
  });
  return NextResponse.json({ concepts });
}

export async function POST(request: Request) {
  const access = await new DovrutAccessService().requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (access.role === "approver") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const concept = await new DovrutConceptService().create(
    { ...parsed.data, created_by: access.profile.id },
    access.profile.name,
    access.profile.email,
  );
  return NextResponse.json({ concept }, { status: 201 });
}
