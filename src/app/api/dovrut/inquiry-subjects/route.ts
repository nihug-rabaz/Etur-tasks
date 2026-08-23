import { NextResponse } from "next/server";
import { z } from "zod";
import { DovrutAccessService } from "@/modules/dovrut/services/access.service";
import { DovrutInquirySubjectService } from "@/modules/dovrut/services/inquiry-subject.service";

const noStore = { headers: { "Cache-Control": "no-store, max-age=0" } };

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional();

const upsertSchema = z.object({
  name: z.string().min(1),
  rank: z.string().nullable().optional(),
  age: z.number().int().nonnegative().nullable().optional(),
  birth_date: dateString,
  hometown: z.string().nullable().optional(),
  family_status: z.string().nullable().optional(),
  enlistment_year: z.number().int().min(1948).max(2100).nullable().optional(),
  years_in_role: z.number().nonnegative().nullable().optional(),
  role_started_at: dateString,
  role_title: z.string().nullable().optional(),
  previous_roles: z.string().nullable().optional(),
  bio: z.string().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET() {
  const access = await new DovrutAccessService().requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const subjects = await new DovrutInquirySubjectService().list();
  return NextResponse.json({ subjects }, noStore);
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
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const subject = await new DovrutInquirySubjectService().create({
    ...parsed.data,
    created_by: access.profile.id,
  });
  return NextResponse.json({ subject }, { status: 201 });
}
