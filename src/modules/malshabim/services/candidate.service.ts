import { BaseService } from "@/services/base.service";
import type {
  MalshabimCandidate,
  MalshabimCandidateWrite,
  MalshabimUpdateLogEntry,
} from "@/modules/malshabim/types";

function asJson(value: unknown): unknown {
  if (value === undefined) return null;
  return value;
}

export class MalshabimCandidateService extends BaseService {
  public async list(limit = 500): Promise<MalshabimCandidate[]> {
    const db = this.getDb();
    return db<MalshabimCandidate[]>`
      select *
      from malshabim_candidates
      order by coalesce(serial_number, 0) desc, created_at desc
      limit ${limit}
    `;
  }

  public async getById(id: string): Promise<MalshabimCandidate | null> {
    const db = this.getDb();
    const rows = await db<MalshabimCandidate[]>`
      select * from malshabim_candidates
      where id = ${id}
      limit 1
    `;
    return rows[0] ?? null;
  }

  public async getByLegacyId(legacyId: string): Promise<MalshabimCandidate | null> {
    const db = this.getDb();
    const rows = await db<MalshabimCandidate[]>`
      select * from malshabim_candidates
      where legacy_base44_id = ${legacyId}
      limit 1
    `;
    return rows[0] ?? null;
  }

  public async nextSerial(): Promise<number> {
    const db = this.getDb();
    const rows = await db<{ next: number }[]>`
      select coalesce(max(serial_number), 0) + 1 as next
      from malshabim_candidates
    `;
    return Number(rows[0]?.next ?? 1);
  }

  public async create(input: MalshabimCandidateWrite): Promise<MalshabimCandidate> {
    const db = this.getDb();
    const serial =
      input.serial_number !== undefined && input.serial_number !== null
        ? input.serial_number
        : await this.nextSerial();

    const rows = await db<MalshabimCandidate[]>`
      insert into malshabim_candidates (
        legacy_base44_id, full_name, phone, id_number, personal_number, serial_number,
        city, photo_url, candidate_status, advanced_status, status_type, request_type,
        recruitment_track, enlistment_date, interview_at, next_status_update_at,
        observance, quiz_questions, quiz_score, quiz_passed, quiz_skipped,
        interview_summary, interviewer_notes, instructions, instruction_items,
        instruction_recipients, is_draft, draft_step, update_log, created_by, created_by_name
      )
      values (
        ${input.legacy_base44_id ?? null},
        ${input.full_name ?? null},
        ${input.phone ?? null},
        ${input.id_number ?? null},
        ${input.personal_number ?? null},
        ${serial},
        ${input.city ?? null},
        ${input.photo_url ?? null},
        ${input.candidate_status ?? "חדש"},
        ${input.advanced_status ?? "בטיפול"},
        ${input.status_type ?? null},
        ${input.request_type ?? null},
        ${input.recruitment_track ?? null},
        ${input.enlistment_date ?? null},
        ${input.interview_at ?? null},
        ${input.next_status_update_at ?? null},
        ${asJson(input.observance ?? {})},
        ${asJson(input.quiz_questions ?? [])},
        ${input.quiz_score ?? null},
        ${input.quiz_passed ?? false},
        ${input.quiz_skipped ?? false},
        ${input.interview_summary ?? null},
        ${input.interviewer_notes ?? null},
        ${input.instructions ?? null},
        ${asJson(input.instruction_items ?? [])},
        ${asJson(input.instruction_recipients ?? [])},
        ${input.is_draft ?? false},
        ${input.draft_step ?? null},
        ${asJson(input.update_log ?? [])},
        ${input.created_by ?? null},
        ${input.created_by_name ?? null}
      )
      returning *
    `;
    return rows[0];
  }

  public async update(
    id: string,
    input: MalshabimCandidateWrite,
  ): Promise<MalshabimCandidate | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const next: MalshabimCandidateWrite = {
      legacy_base44_id:
        input.legacy_base44_id !== undefined ? input.legacy_base44_id : existing.legacy_base44_id,
      full_name: input.full_name !== undefined ? input.full_name : existing.full_name,
      phone: input.phone !== undefined ? input.phone : existing.phone,
      id_number: input.id_number !== undefined ? input.id_number : existing.id_number,
      personal_number:
        input.personal_number !== undefined ? input.personal_number : existing.personal_number,
      serial_number:
        input.serial_number !== undefined ? input.serial_number : existing.serial_number,
      city: input.city !== undefined ? input.city : existing.city,
      photo_url: input.photo_url !== undefined ? input.photo_url : existing.photo_url,
      candidate_status:
        input.candidate_status !== undefined ? input.candidate_status : existing.candidate_status,
      advanced_status:
        input.advanced_status !== undefined ? input.advanced_status : existing.advanced_status,
      status_type: input.status_type !== undefined ? input.status_type : existing.status_type,
      request_type: input.request_type !== undefined ? input.request_type : existing.request_type,
      recruitment_track:
        input.recruitment_track !== undefined
          ? input.recruitment_track
          : existing.recruitment_track,
      enlistment_date:
        input.enlistment_date !== undefined ? input.enlistment_date : existing.enlistment_date,
      interview_at: input.interview_at !== undefined ? input.interview_at : existing.interview_at,
      next_status_update_at:
        input.next_status_update_at !== undefined
          ? input.next_status_update_at
          : existing.next_status_update_at,
      observance: input.observance !== undefined ? input.observance : existing.observance,
      quiz_questions:
        input.quiz_questions !== undefined ? input.quiz_questions : existing.quiz_questions,
      quiz_score: input.quiz_score !== undefined ? input.quiz_score : existing.quiz_score,
      quiz_passed: input.quiz_passed !== undefined ? input.quiz_passed : existing.quiz_passed,
      quiz_skipped: input.quiz_skipped !== undefined ? input.quiz_skipped : existing.quiz_skipped,
      interview_summary:
        input.interview_summary !== undefined
          ? input.interview_summary
          : existing.interview_summary,
      interviewer_notes:
        input.interviewer_notes !== undefined
          ? input.interviewer_notes
          : existing.interviewer_notes,
      instructions: input.instructions !== undefined ? input.instructions : existing.instructions,
      instruction_items:
        input.instruction_items !== undefined
          ? input.instruction_items
          : existing.instruction_items,
      instruction_recipients:
        input.instruction_recipients !== undefined
          ? input.instruction_recipients
          : existing.instruction_recipients,
      is_draft: input.is_draft !== undefined ? input.is_draft : existing.is_draft,
      draft_step: input.draft_step !== undefined ? input.draft_step : existing.draft_step,
      update_log: input.update_log !== undefined ? input.update_log : existing.update_log,
      created_by_name:
        input.created_by_name !== undefined ? input.created_by_name : existing.created_by_name,
    };

    const db = this.getDb();
    const rows = await db<MalshabimCandidate[]>`
      update malshabim_candidates set
        legacy_base44_id = ${next.legacy_base44_id ?? null},
        full_name = ${next.full_name ?? null},
        phone = ${next.phone ?? null},
        id_number = ${next.id_number ?? null},
        personal_number = ${next.personal_number ?? null},
        serial_number = ${next.serial_number ?? null},
        city = ${next.city ?? null},
        photo_url = ${next.photo_url ?? null},
        candidate_status = ${next.candidate_status ?? "חדש"},
        advanced_status = ${next.advanced_status ?? "בטיפול"},
        status_type = ${next.status_type ?? null},
        request_type = ${next.request_type ?? null},
        recruitment_track = ${next.recruitment_track ?? null},
        enlistment_date = ${next.enlistment_date ?? null},
        interview_at = ${next.interview_at ?? null},
        next_status_update_at = ${next.next_status_update_at ?? null},
        observance = ${asJson(next.observance ?? {})},
        quiz_questions = ${asJson(next.quiz_questions ?? [])},
        quiz_score = ${next.quiz_score ?? null},
        quiz_passed = ${next.quiz_passed ?? false},
        quiz_skipped = ${next.quiz_skipped ?? false},
        interview_summary = ${next.interview_summary ?? null},
        interviewer_notes = ${next.interviewer_notes ?? null},
        instructions = ${next.instructions ?? null},
        instruction_items = ${asJson(next.instruction_items ?? [])},
        instruction_recipients = ${asJson(next.instruction_recipients ?? [])},
        is_draft = ${next.is_draft ?? false},
        draft_step = ${next.draft_step ?? null},
        update_log = ${asJson(next.update_log ?? [])},
        created_by_name = ${next.created_by_name ?? null},
        updated_at = now()
      where id = ${id}
      returning *
    `;
    return rows[0] ?? null;
  }

  public async delete(id: string): Promise<boolean> {
    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      delete from malshabim_candidates
      where id = ${id}
      returning id
    `;
    return rows.length > 0;
  }

  public async appendUpdateLog(
    id: string,
    entry: MalshabimUpdateLogEntry,
  ): Promise<MalshabimCandidate | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    const log = [...(existing.update_log || []), entry];
    return this.update(id, { update_log: log });
  }

  public async importRows(
    rows: MalshabimCandidateWrite[],
  ): Promise<{ inserted: number; updated: number; skipped: number }> {
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      if (!row.full_name && !row.legacy_base44_id && !row.id_number) {
        skipped += 1;
        continue;
      }

      if (row.legacy_base44_id) {
        const existing = await this.getByLegacyId(row.legacy_base44_id);
        if (existing) {
          await this.update(existing.id, row);
          updated += 1;
          continue;
        }
      }

      await this.create(row);
      inserted += 1;
    }

    return { inserted, updated, skipped };
  }
}
