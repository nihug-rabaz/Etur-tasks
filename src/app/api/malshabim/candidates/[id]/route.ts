import { NextResponse } from "next/server";
import { z } from "zod";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";
import { MalshabimCandidateService } from "@/modules/malshabim/services/candidate.service";
import { NotificationService } from "@/services/notification.service";
import type { MalshabimInstructionItem } from "@/modules/malshabim/types";

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
  interviewer_user_id: z.string().uuid().optional().nullable(),
  awaiting_admin_approval: z.boolean().optional().nullable(),
  approval_requested_at: z.string().optional().nullable(),
  interview_reminder_sent_at: z.string().optional().nullable(),
  request_meta: z.record(z.string(), z.unknown()).optional().nullable(),
});

function isDuplicateError(error: unknown): error is Error {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("תעודת זהות כבר קיימת") ||
    error.message.includes("מספר אישי כבר קיים")
  );
}

function marksInstructionCompleted(
  previous: MalshabimInstructionItem[] | unknown[] | null | undefined,
  next: unknown[] | null | undefined,
): boolean {
  if (!next) return false;
  const prevItems = (previous ?? []) as MalshabimInstructionItem[];
  const nextItems = next as MalshabimInstructionItem[];
  return nextItems.some((item, index) => {
    if (item?.status !== "הושלם") return false;
    const prevStatus = prevItems[index]?.status;
    return prevStatus !== "הושלם";
  });
}

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
  const existing = await service.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { update_log_entry, ...fields } = parsed.data;

  if (
    fields.instruction_items !== undefined &&
    marksInstructionCompleted(existing.instruction_items, fields.instruction_items) &&
    access.role !== "admin"
  ) {
    return NextResponse.json(
      { error: "רק מנהל יכול לסמן הוראה כהושלמה" },
      { status: 403 },
    );
  }

  const requestingApproval =
    fields.awaiting_admin_approval === true && !existing.awaiting_admin_approval;

  if (requestingApproval) {
    fields.approval_requested_at = new Date().toISOString();
  }

  try {
    const candidate = await service.update(
      id,
      fields as Parameters<MalshabimCandidateService["update"]>[1],
    );
    if (!candidate) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (requestingApproval) {
      await new NotificationService().notifyMalshabimApprovalRequested({
        candidateId: candidate.id,
        fullName: candidate.full_name ?? "מועמד",
        requesterName: access.profile.name,
      });
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
  } catch (error) {
    if (isDuplicateError(error)) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
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
