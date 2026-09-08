import { NextResponse } from "next/server";
import { z } from "zod";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";
import { MalshabimCandidateService } from "@/modules/malshabim/services/candidate.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new MalshabimAccessService().requireMalshabimAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const candidate = await new MalshabimCandidateService().getById(id);
  if (!candidate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    candidate,
    role: access.role,
    currentUserId: access.profile.id,
    currentUserName: access.profile.name,
  });
}

const patchSchema = z.object({
  full_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  id_number: z.string().optional().nullable(),
  personal_number: z.string().optional().nullable(),
  serial_number: z.number().int().optional().nullable(),
  city: z.string().optional().nullable(),
  photo_url: z.string().optional().nullable(),
  candidate_status: z.string().optional().nullable(),
  advanced_status: z.string().optional().nullable(),
  status_type: z.string().optional().nullable(),
  request_type: z.string().optional().nullable(),
  recruitment_track: z.string().optional().nullable(),
  enlistment_date: z.string().optional().nullable(),
  interview_at: z.string().optional().nullable(),
  next_status_update_at: z.string().optional().nullable(),
  observance: z.record(z.string(), z.unknown()).optional().nullable(),
  quiz_questions: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
  quiz_score: z.number().optional().nullable(),
  quiz_passed: z.boolean().optional().nullable(),
  quiz_skipped: z.boolean().optional().nullable(),
  interview_summary: z.string().optional().nullable(),
  interviewer_notes: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  instruction_items: z.array(z.unknown()).optional().nullable(),
  instruction_recipients: z.array(z.unknown()).optional().nullable(),
  is_draft: z.boolean().optional().nullable(),
  draft_step: z.number().int().optional().nullable(),
  update_log: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
  update_log_entry: z
    .object({
      changes: z.string().optional().nullable(),
      updated_by: z.string().optional().nullable(),
      date: z.string().optional().nullable(),
    })
    .optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const accessService = new MalshabimAccessService();
  const access = await accessService.requireMalshabimAccess("user");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const service = new MalshabimCandidateService();
  const { update_log_entry, ...fields } = parsed.data;
  const candidate = await service.update(
    id,
    fields as Parameters<MalshabimCandidateService["update"]>[1],
  );
  if (!candidate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (update_log_entry) {
    const withLog = await service.appendUpdateLog(id, {
      ...update_log_entry,
      date: update_log_entry.date ?? new Date().toISOString(),
      updated_by: update_log_entry.updated_by ?? access.profile.name,
    });
    return NextResponse.json({ candidate: withLog ?? candidate });
  }

  return NextResponse.json({ candidate });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new MalshabimAccessService().requireMalshabimAccess("admin");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const deleted = await new MalshabimCandidateService().delete(id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
