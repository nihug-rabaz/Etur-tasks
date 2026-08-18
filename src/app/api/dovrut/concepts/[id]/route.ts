import { NextResponse } from "next/server";
import { z } from "zod";
import { DovrutAccessService } from "@/modules/dovrut/services/access.service";
import { DovrutConceptService } from "@/modules/dovrut/services/concept.service";

const workStatus = z.enum(["planning", "production", "waiting_approvals", "approved"]);

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
  interviewer: z.string().nullable().optional(),
  needs_briefing: z.boolean().optional(),
  requires_chief_rabbi: z.boolean().optional(),
  requires_deputy_commander: z.boolean().optional(),
  requires_branch_head: z.boolean().optional(),
  target_audience: z.string().nullable().optional(),
  target_audiences: z.array(z.string()).optional(),
  domains: z.array(z.enum([
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
  ])).optional(),
  is_draft: z.boolean().optional(),
  restore: z.boolean().optional(),
  link: z.string().nullable().optional(),
  details: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  work_status_article: workStatus.nullable().optional(),
  work_status_social: workStatus.nullable().optional(),
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
  linked_task_id: z.string().uuid().nullable().optional(),
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
  const [concept, activity] = await Promise.all([service.getById(id), service.listActivity(id)]);
  if (!concept) return NextResponse.json({ error: "Not found" }, { status: 404 });
  void service.touchOpened(id);
  return NextResponse.json({ concept, item: concept, activity });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const accessService = new DovrutAccessService();
  const access = await accessService.requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!accessService.canEditContent(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  if (parsed.data.restore) {
    const ok = await new DovrutConceptService().restore(id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const restored = await new DovrutConceptService().getById(id);
    return NextResponse.json({ concept: restored, item: restored });
  }
  if (
    parsed.data.approval_status &&
    !accessService.canForceApproval(access.role)
  ) {
    return NextResponse.json({ error: "Only admin can set approval status" }, { status: 403 });
  }
  const existing = await new DovrutConceptService().getById(id);
  const patch = { ...parsed.data };
  delete patch.restore;
  const patchKeys = (Object.keys(patch) as Array<keyof typeof patch>).filter(
    (key) => patch[key] !== undefined,
  );
  const workKey = patchKeys.find(
    (key) => key === "work_status_article" || key === "work_status_social",
  );
  const workOnly = Boolean(workKey) && patchKeys.length === 1;
  if (workOnly && workKey) {
    const concept = await new DovrutConceptService().updateWorkStatus(
      id,
      patch[workKey] as "planning" | "production" | "waiting_approvals" | "approved",
      access.profile.name,
      access.profile.email,
    );
    if (!concept) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ concept, item: concept });
  }
  if (existing?.type === "social_media") {
    patch.link = null;
  }
  const concept = await new DovrutConceptService().update(
    id,
    patch,
    access.profile.name,
    access.profile.email,
  );
  if (!concept) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ concept, item: concept });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const accessService = new DovrutAccessService();
  const access = await accessService.requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { searchParams } = new URL(request.url);
  const purge = searchParams.get("purge") === "1";
  if (purge && !accessService.canDelete(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!purge && !accessService.canEditContent(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  const ok = purge
    ? await new DovrutConceptService().purge(id)
    : await new DovrutConceptService().softDelete(
        id,
        access.profile.name,
        access.profile.email,
      );
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
