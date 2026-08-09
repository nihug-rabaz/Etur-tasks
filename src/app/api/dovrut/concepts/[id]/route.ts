import { NextResponse } from "next/server";
import { z } from "zod";
import { DovrutAccessService } from "@/modules/dovrut/services/access.service";
import { DovrutConceptService } from "@/modules/dovrut/services/concept.service";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
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
  work_status_article: z
    .enum([
      "planning",
      "production",
      "waiting_approvals",
      "waiting_spokesperson",
      "waiting_publish",
      "published",
    ])
    .nullable()
    .optional(),
  work_status_social: z
    .enum(["planning", "production", "waiting_approval", "waiting_publish", "published"])
    .nullable()
    .optional(),
  approval_status: z
    .enum([
      "waiting_spokesperson_officer",
      "waiting_branch_head",
      "waiting_deputy_commander",
      "waiting_chief_rabbi",
      "waiting_command_rabbi",
      "approved",
    ])
    .nullable()
    .optional(),
  content_type: z.enum(["carousel", "video", "image", "reels", "text"]).nullable().optional(),
  draft_text: z.string().nullable().optional(),
  draft_images: z.array(z.string()).optional(),
  draft_videos: z.array(z.string()).optional(),
  partners: z.array(z.string()).optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new DovrutAccessService().requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const service = new DovrutConceptService();
  const concept = await service.getById(id);
  if (!concept) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const activity = await service.listActivity(id);
  return NextResponse.json({ concept, activity });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new DovrutAccessService().requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (access.role === "approver") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  if (parsed.data.approval_status && access.role !== "admin" && access.profile.role !== "admin") {
    return NextResponse.json({ error: "Only admin can set approval status" }, { status: 403 });
  }
  const concept = await new DovrutConceptService().update(
    id,
    parsed.data,
    access.profile.name,
    access.profile.email,
  );
  if (!concept) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ concept });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new DovrutAccessService().requireDovrutAccess("admin");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const ok = await new DovrutConceptService().delete(
    id,
    access.profile.name,
    access.profile.email,
  );
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
