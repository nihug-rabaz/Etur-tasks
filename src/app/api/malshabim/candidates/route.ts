import { NextResponse } from "next/server";
import { z } from "zod";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";
import { MalshabimCandidateService } from "@/modules/malshabim/services/candidate.service";

export async function GET() {
  const access = await new MalshabimAccessService().requireMalshabimAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const candidates = await new MalshabimCandidateService().list();
  return NextResponse.json({
    candidates,
    role: access.role,
    currentUserId: access.profile.id,
  });
}

const createSchema = z
  .object({
    full_name: z.string().min(1).optional().nullable(),
    fullName: z.string().min(1).optional().nullable(),
    phone: z.string().optional().nullable(),
    id_number: z.string().optional().nullable(),
    idNumber: z.string().optional().nullable(),
    personal_number: z.string().optional().nullable(),
    personalNumber: z.string().optional().nullable(),
    serial_number: z.number().int().optional().nullable(),
    serialNumber: z.number().int().optional().nullable(),
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
    legacy_base44_id: z.string().optional().nullable(),
  })
  .refine((data) => Boolean(data.full_name || data.fullName), {
    message: "full_name required",
  });

export async function POST(request: Request) {
  const accessService = new MalshabimAccessService();
  const access = await accessService.requireMalshabimAccess("user");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }
  const data = parsed.data;
  const service = new MalshabimCandidateService();
  const candidate = await service.create({
    full_name: data.full_name ?? data.fullName ?? null,
    phone: data.phone ?? null,
    id_number: data.id_number ?? data.idNumber ?? null,
    personal_number: data.personal_number ?? data.personalNumber ?? null,
    serial_number: data.serial_number ?? data.serialNumber ?? null,
    city: data.city ?? null,
    photo_url: data.photo_url ?? null,
    candidate_status: data.candidate_status ?? undefined,
    advanced_status: data.advanced_status ?? undefined,
    status_type: data.status_type ?? null,
    request_type: data.request_type ?? null,
    recruitment_track: data.recruitment_track ?? null,
    enlistment_date: data.enlistment_date ?? null,
    interview_at: data.interview_at ?? null,
    next_status_update_at: data.next_status_update_at ?? null,
    observance: data.observance ?? undefined,
    quiz_questions: data.quiz_questions ?? undefined,
    quiz_score: data.quiz_score ?? null,
    quiz_passed: data.quiz_passed ?? undefined,
    quiz_skipped: data.quiz_skipped ?? undefined,
    interview_summary: data.interview_summary ?? null,
    interviewer_notes: data.interviewer_notes ?? null,
    instructions: data.instructions ?? null,
    instruction_items: data.instruction_items ?? undefined,
    instruction_recipients: data.instruction_recipients ?? undefined,
    is_draft: data.is_draft ?? undefined,
    draft_step: data.draft_step ?? null,
    update_log: data.update_log ?? undefined,
    legacy_base44_id: data.legacy_base44_id ?? null,
    created_by: access.profile.id,
    created_by_name: access.profile.name,
  });
  return NextResponse.json({ candidate }, { status: 201 });
}
