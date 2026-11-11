import { put } from "@vercel/blob";
import { BaseService } from "@/services/base.service";
import { Env } from "@/lib/env";

export type DevFeedbackPendingStatus = "pending" | "approved" | "rejected";

export type DevFeedbackPendingRow = {
  id: string;
  title: string;
  description: string;
  module_id: string;
  page_url: string | null;
  status: DevFeedbackPendingStatus;
  submitter_id: string | null;
  submitter_name: string | null;
  submitter_email: string | null;
  kobi_notes: string | null;
  jira_issue_key: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DevFeedbackAttachmentRow = {
  id: string;
  pending_id: string;
  filename: string;
  content_type: string;
  blob_url: string | null;
  data_base64: string | null;
  created_at: string;
};

let schemaReady = false;

export class DevFeedbackPendingService extends BaseService {
  private async ensureSchema(): Promise<void> {
    if (schemaReady) return;
    const db = this.getDb();
    await db`
      create table if not exists public.dev_feedback_pending (
        id uuid primary key default gen_random_uuid(),
        title text not null,
        description text not null,
        module_id text not null,
        page_url text,
        status text not null default 'pending',
        submitter_id uuid,
        submitter_name text,
        submitter_email text,
        kobi_notes text,
        jira_issue_key text,
        reviewed_by_name text,
        reviewed_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `;
    await db`
      create table if not exists public.dev_feedback_attachments (
        id uuid primary key default gen_random_uuid(),
        pending_id uuid not null references public.dev_feedback_pending (id) on delete cascade,
        filename text not null,
        content_type text not null default 'application/octet-stream',
        blob_url text,
        data_base64 text,
        created_at timestamptz not null default now()
      )
    `;
    await db`
      create index if not exists dev_feedback_pending_status_created_idx
        on public.dev_feedback_pending (status, created_at desc)
    `;
    schemaReady = true;
  }

  public async createPending(input: {
    title: string;
    description: string;
    moduleId: string;
    pageUrl?: string | null;
    submitterId?: string | null;
    submitterName?: string | null;
    submitterEmail?: string | null;
    files: { blob: Blob; name: string }[];
  }): Promise<DevFeedbackPendingRow> {
    await this.ensureSchema();
    const db = this.getDb();
    const rows = await db<DevFeedbackPendingRow[]>`
      insert into public.dev_feedback_pending (
        title, description, module_id, page_url,
        submitter_id, submitter_name, submitter_email, status
      )
      values (
        ${input.title},
        ${input.description},
        ${input.moduleId},
        ${input.pageUrl || null},
        ${input.submitterId || null},
        ${input.submitterName || null},
        ${input.submitterEmail || null},
        'pending'
      )
      returning *
    `;
    const row = rows[0];
    for (const file of input.files) {
      await this.storeAttachment(row.id, file.blob, file.name);
    }
    return row;
  }

  public async listPending(): Promise<
    Array<
      DevFeedbackPendingRow & {
        attachments: Array<{
          id: string;
          filename: string;
          contentType: string;
          previewUrl: string | null;
        }>;
      }
    >
  > {
    await this.ensureSchema();
    const db = this.getDb();
    const rows = await db<DevFeedbackPendingRow[]>`
      select * from public.dev_feedback_pending
      where status = 'pending'
      order by created_at desc
      limit 100
    `;
    const result = [];
    for (const row of rows) {
      const attachments = await this.listAttachmentMeta(row.id);
      result.push({ ...row, attachments });
    }
    return result;
  }

  public async getPending(id: string): Promise<DevFeedbackPendingRow | null> {
    await this.ensureSchema();
    const db = this.getDb();
    const rows = await db<DevFeedbackPendingRow[]>`
      select * from public.dev_feedback_pending where id = ${id}::uuid limit 1
    `;
    return rows[0] ?? null;
  }

  public async appendNotes(id: string, notes: string, reviewerName: string): Promise<void> {
    await this.ensureSchema();
    const db = this.getDb();
    const stamp = new Date().toISOString();
    const line = `[${stamp}] ${reviewerName}: ${notes}`;
    await db`
      update public.dev_feedback_pending
      set
        kobi_notes = case
          when kobi_notes is null or kobi_notes = '' then ${line}
          else kobi_notes || E'\n' || ${line}
        end,
        updated_at = now()
      where id = ${id}::uuid and status = 'pending'
    `;
  }

  public async markRejected(input: {
    id: string;
    notes: string;
    reviewerName: string;
  }): Promise<void> {
    await this.ensureSchema();
    const db = this.getDb();
    const stamp = new Date().toISOString();
    const line = `[${stamp}] דחייה · ${input.reviewerName}: ${input.notes}`;
    const updated = await db<{ id: string }[]>`
      update public.dev_feedback_pending
      set
        status = 'rejected',
        kobi_notes = case
          when kobi_notes is null or kobi_notes = '' then ${line}
          else kobi_notes || E'\n' || ${line}
        end,
        reviewed_by_name = ${input.reviewerName},
        reviewed_at = now(),
        updated_at = now()
      where id = ${input.id}::uuid and status = 'pending'
      returning id
    `;
    if (!updated.length) throw new Error("המשימה אינה ממתינה לאישור");
  }

  public async markApproved(input: {
    id: string;
    jiraIssueKey: string;
    notes?: string | null;
    reviewerName: string;
  }): Promise<void> {
    await this.ensureSchema();
    const db = this.getDb();
    const notes = (input.notes ?? "").trim();
    const stamp = new Date().toISOString();
    const line = notes
      ? `[${stamp}] אישור · ${input.reviewerName}: ${notes}`
      : null;
    const updated = await db<{ id: string }[]>`
      update public.dev_feedback_pending
      set
        status = 'approved',
        jira_issue_key = ${input.jiraIssueKey},
        kobi_notes = case
          when ${line}::text is null then kobi_notes
          when kobi_notes is null or kobi_notes = '' then ${line}
          else kobi_notes || E'\n' || ${line}
        end,
        reviewed_by_name = ${input.reviewerName},
        reviewed_at = now(),
        updated_at = now()
      where id = ${input.id}::uuid and status = 'pending'
      returning id
    `;
    if (!updated.length) throw new Error("המשימה אינה ממתינה לאישור");
  }

  public async loadAttachmentBlobs(
    pendingId: string,
  ): Promise<Array<{ blob: Blob; name: string }>> {
    await this.ensureSchema();
    const db = this.getDb();
    const rows = await db<DevFeedbackAttachmentRow[]>`
      select * from public.dev_feedback_attachments
      where pending_id = ${pendingId}::uuid
      order by created_at asc
    `;
    const out: Array<{ blob: Blob; name: string }> = [];
    for (const row of rows) {
      if (row.data_base64) {
        const bytes = Buffer.from(row.data_base64, "base64");
        out.push({
          blob: new Blob([bytes], { type: row.content_type }),
          name: row.filename,
        });
        continue;
      }
      if (row.blob_url) {
        const res = await fetch(row.blob_url);
        if (!res.ok) continue;
        const blob = await res.blob();
        out.push({ blob, name: row.filename });
      }
    }
    return out;
  }

  private async listAttachmentMeta(pendingId: string) {
    const db = this.getDb();
    const rows = await db<DevFeedbackAttachmentRow[]>`
      select * from public.dev_feedback_attachments
      where pending_id = ${pendingId}::uuid
      order by created_at asc
    `;
    return rows.map((row) => ({
      id: row.id,
      filename: row.filename,
      contentType: row.content_type,
      previewUrl: row.blob_url,
    }));
  }

  private async storeAttachment(
    pendingId: string,
    file: Blob,
    filename: string,
  ): Promise<void> {
    const db = this.getDb();
    const contentType = file.type || "application/octet-stream";
    const token = Env.get("BLOB_READ_WRITE_TOKEN");
    if (token) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const blob = await put(
          `dev-feedback/${pendingId}/${Date.now()}-${filename}`,
          buffer,
          { access: "public", token, contentType },
        );
        await db`
          insert into public.dev_feedback_attachments (
            pending_id, filename, content_type, blob_url
          )
          values (
            ${pendingId}::uuid, ${filename}, ${contentType}, ${blob.url}
          )
        `;
        return;
      } catch (error) {
        console.warn("[dev-feedback-blob]", error);
      }
    }
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    await db`
      insert into public.dev_feedback_attachments (
        pending_id, filename, content_type, data_base64
      )
      values (
        ${pendingId}::uuid, ${filename}, ${contentType}, ${base64}
      )
    `;
  }
}
