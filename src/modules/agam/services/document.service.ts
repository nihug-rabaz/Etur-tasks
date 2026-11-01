import { getDownloadUrl, put } from "@vercel/blob";
import { BaseService } from "@/services/base.service";
import { Env } from "@/lib/env";
import { sanitizeFileName, validateUploadFile } from "@/modules/agam/lib/file-validation";
import {
  DB_FILE_PREFIX,
  MAX_UPLOAD_BYTES_WITH_BLOB,
  MAX_UPLOAD_BYTES_WITHOUT_BLOB,
} from "@/modules/agam/lib/document-types";
import type { AgamDocument, AgamUploadSource } from "@/modules/agam/types";

export class AgamDocumentService extends BaseService {
  public async getById(id: string): Promise<AgamDocument | null> {
    const db = this.getDb();
    const rows = await db<AgamDocument[]>`
      select * from agam_candidate_documents where id = ${id} limit 1
    `;
    return rows[0] ?? null;
  }
  public async listByCandidate(candidateId: string): Promise<AgamDocument[]> {
    const db = this.getDb();
    return db<AgamDocument[]>`
      select * from agam_candidate_documents
      where candidate_id = ${candidateId}
      order by created_at desc
    `;
  }

  public async create(input: {
    candidate_id: string;
    name: string;
    file_url: string;
    document_type: string | null;
    upload_source: AgamUploadSource | null;
    notes: string | null;
    uploaded_by_name: string | null;
    file_size?: number | null;
    content_type?: string | null;
  }): Promise<AgamDocument> {
    const db = this.getDb();
    const rows = await db<AgamDocument[]>`
      insert into agam_candidate_documents (
        candidate_id, name, file_url, document_type, upload_source, notes, uploaded_by_name,
        file_size, content_type
      )
      values (
        ${input.candidate_id},
        ${input.name},
        ${input.file_url},
        ${input.document_type},
        ${input.upload_source},
        ${input.notes},
        ${input.uploaded_by_name},
        ${input.file_size ?? null},
        ${input.content_type ?? null}
      )
      returning *
    `;
    return rows[0];
  }

  public async updateNotes(id: string, notes: string): Promise<boolean> {
    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      update agam_candidate_documents set notes = ${notes}, updated_at = now() where id = ${id}
      returning id
    `;
    return rows.length > 0;
  }

  public async setApproval(id: string, approverName: string | null): Promise<boolean> {
    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      update agam_candidate_documents
      set approved_at = ${approverName ? new Date().toISOString() : null},
        approved_by_name = ${approverName},
        updated_at = now()
      where id = ${id}
      returning id
    `;
    return rows.length > 0;
  }

  public async delete(id: string): Promise<boolean> {
    const db = this.getDb();
    const rows = await db<{ id: string; file_url: string }[]>`
      delete from agam_candidate_documents where id = ${id} returning id, file_url
    `;
    const fileId = rows[0] ? this.dbFileId(rows[0].file_url) : null;
    if (fileId) {
      await db`delete from agam_document_files where id = ${fileId}::uuid`;
    }
    return rows.length > 0;
  }

  public async storeFile(candidateId: string, file: File): Promise<string> {
    validateUploadFile(file);
    const safeName = sanitizeFileName(file.name);
    const token = Env.get("BLOB_READ_WRITE_TOKEN");
    const maxBytes = token ? MAX_UPLOAD_BYTES_WITH_BLOB : MAX_UPLOAD_BYTES_WITHOUT_BLOB;
    if (file.size > maxBytes) {
      throw new Error("FILE_TOO_LARGE");
    }
    if (token) {
      const blob = await put(`agam/${candidateId}/${Date.now()}-${safeName}`, file, {
        access: "private",
        token,
      });
      return blob.url;
    }
    const db = this.getDb();
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const rows = await db<{ id: string }[]>`
      insert into agam_document_files (content_type, data_base64)
      values (${file.type || "application/octet-stream"}, ${base64})
      returning id
    `;
    return `${DB_FILE_PREFIX}${rows[0].id}`;
  }

  public dbFileId(fileUrl: string): string | null {
    return fileUrl.startsWith(DB_FILE_PREFIX) ? fileUrl.slice(DB_FILE_PREFIX.length) : null;
  }

  public async readDbFile(fileId: string): Promise<{ bytes: Buffer; contentType: string } | null> {
    const db = this.getDb();
    const rows = await db<{ content_type: string; data_base64: string }[]>`
      select content_type, data_base64 from agam_document_files where id = ${fileId}::uuid limit 1
    `;
    const row = rows[0];
    if (!row) return null;
    return { bytes: Buffer.from(row.data_base64, "base64"), contentType: row.content_type };
  }

  public resolveDownloadUrl(fileUrl: string): string {
    if (!fileUrl.includes("blob.vercel-storage.com")) {
      return fileUrl;
    }
    return getDownloadUrl(fileUrl);
  }
}
