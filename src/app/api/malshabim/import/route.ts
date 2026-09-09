import { NextResponse } from "next/server";
import { z } from "zod";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";
import { MalshabimCandidateService } from "@/modules/malshabim/services/candidate.service";
import type { MalshabimCandidateWrite } from "@/modules/malshabim/types";

const rowSchema = z
  .object({
    legacy_base44_id: z.string().optional().nullable(),
    id: z.string().optional().nullable(),
    full_name: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    id_number: z.string().optional().nullable(),
    personal_number: z.string().optional().nullable(),
    serial_number: z.union([z.number(), z.string()]).optional().nullable(),
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
    observance: z.unknown().optional().nullable(),
    quiz_questions: z.unknown().optional().nullable(),
    quiz_score: z.union([z.number(), z.string()]).optional().nullable(),
    quiz_passed: z.boolean().optional().nullable(),
    quiz_skipped: z.boolean().optional().nullable(),
    interview_summary: z.string().optional().nullable(),
    interviewer_notes: z.string().optional().nullable(),
    instructions: z.string().optional().nullable(),
    instruction_items: z.unknown().optional().nullable(),
    instruction_recipients: z.unknown().optional().nullable(),
    is_draft: z.boolean().optional().nullable(),
    draft_step: z.union([z.number(), z.string()]).optional().nullable(),
    update_log: z.unknown().optional().nullable(),
    created_by_name: z.string().optional().nullable(),
    is_sample: z.boolean().optional().nullable(),
    request_meta: z.unknown().optional().nullable(),
    interviewer_user_id: z.string().optional().nullable(),
  })
  .passthrough();

const bodySchema = z.union([
  z.array(rowSchema),
  z.object({ candidates: z.array(rowSchema) }),
]);

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function toObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* ignore */
    }
  }
  return {};
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* ignore */
    }
  }
  return [];
}

function mapRow(
  row: z.infer<typeof rowSchema>,
  createdBy: string | null,
): MalshabimCandidateWrite | null {
  if (row.is_sample === true) return null;
  return {
    legacy_base44_id: row.legacy_base44_id ?? row.id ?? null,
    full_name: row.full_name ?? null,
    phone: row.phone ?? null,
    id_number: row.id_number ?? null,
    personal_number: row.personal_number ?? null,
    serial_number: toNumber(row.serial_number),
    city: row.city ?? null,
    photo_url: row.photo_url ?? null,
    candidate_status: row.candidate_status ?? undefined,
    advanced_status: row.advanced_status ?? undefined,
    status_type: row.status_type ?? null,
    request_type: row.request_type ?? null,
    recruitment_track: row.recruitment_track ?? null,
    enlistment_date: row.enlistment_date ?? null,
    interview_at: row.interview_at ?? null,
    next_status_update_at: row.next_status_update_at ?? null,
    observance: toObject(row.observance),
    quiz_questions: toArray(row.quiz_questions) as MalshabimCandidateWrite["quiz_questions"],
    quiz_score: toNumber(row.quiz_score),
    quiz_passed: row.quiz_passed ?? undefined,
    quiz_skipped: row.quiz_skipped ?? undefined,
    interview_summary: row.interview_summary ?? null,
    interviewer_notes: row.interviewer_notes ?? null,
    instructions: row.instructions ?? null,
    instruction_items: toArray(
      row.instruction_items,
    ) as MalshabimCandidateWrite["instruction_items"],
    instruction_recipients: toArray(row.instruction_recipients),
    is_draft: row.is_draft ?? undefined,
    draft_step: toNumber(row.draft_step),
    update_log: toArray(row.update_log) as MalshabimCandidateWrite["update_log"],
    created_by: createdBy,
    created_by_name: row.created_by_name ?? null,
    request_meta: toObject(row.request_meta),
    interviewer_user_id:
      typeof row.interviewer_user_id === "string" ? row.interviewer_user_id : null,
  };
}

export async function POST(request: Request) {
  const access = await new MalshabimAccessService().requireMalshabimAccess("admin");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

  const rawRows = Array.isArray(parsed.data) ? parsed.data : parsed.data.candidates;
  const rows = rawRows
    .map((row) => mapRow(row, access.profile.id))
    .filter((row): row is MalshabimCandidateWrite => row !== null);

  const result = await new MalshabimCandidateService().importRows(rows);
  return NextResponse.json({ ok: true, ...result, received: rawRows.length });
}
