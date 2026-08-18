import { NextResponse } from "next/server";
import { z } from "zod";
import { DovrutAccessService } from "@/modules/dovrut/services/access.service";
import { DovrutInquirySubjectService } from "@/modules/dovrut/services/inquiry-subject.service";

const upsertSchema = z.object({
  name: z.string().min(1).optional(),
  age: z.number().int().positive().nullable().optional(),
  hometown: z.string().nullable().optional(),
  family_status: z.string().nullable().optional(),
  enlistment_year: z.number().int().min(1948).max(2100).nullable().optional(),
  years_in_role: z.number().nonnegative().nullable().optional(),
  role_title: z.string().nullable().optional(),
  previous_roles: z.string().nullable().optional(),
  bio: z.string().optional(),
  notes: z.string().nullable().optional(),
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
  const subject = await new DovrutInquirySubjectService().getById(id);
  if (!subject) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ subject });
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
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const subject = await new DovrutInquirySubjectService().update(id, parsed.data);
  if (!subject) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ subject });
}

export async function DELETE(
  _request: Request,
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
  const ok = await new DovrutInquirySubjectService().softDelete(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
