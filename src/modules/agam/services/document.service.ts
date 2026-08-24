import { put } from "@vercel/blob";
import { BaseService } from "@/services/base.service";
import { Env } from "@/lib/env";
import {
  MAX_UPLOAD_BYTES_WITH_BLOB,
  MAX_UPLOAD_BYTES_WITHOUT_BLOB,
} from "@/modules/agam/lib/document-types";
import type { AgamDocument, AgamUploadSource } from "@/modules/agam/types";

export class AgamDocumentService extends BaseService {
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
  }): Promise<AgamDocument> {
    const db = this.getDb();
    const rows = await db<AgamDocument[]>`
      insert into agam_candidate_documents (
        candidate_id, name, file_url, document_type, upload_source, notes, uploaded_by_name
      )
      values (
        ${input.candidate_id},
        ${input.name},
        ${input.file_url},
        ${input.document_type},
        ${input.upload_source},
        ${input.notes},
        ${input.uploaded_by_name}
      )
      returning *
    `;
    return rows[0];
  }

  public async updateNotes(id: string, notes: string): Promise<void> {
    const db = this.getDb();
    await db`
      update agam_candidate_documents set notes = ${notes}, updated_at = now() where id = ${id}
    `;
  }

  public async delete(id: string): Promise<void> {
    const db = this.getDb();
    await db`delete from agam_candidate_documents where id = ${id}`;
  }

  public async storeFile(candidateId: string, file: File): Promise<string> {
    const token = Env.get("BLOB_READ_WRITE_TOKEN");
    const maxBytes = token ? MAX_UPLOAD_BYTES_WITH_BLOB : MAX_UPLOAD_BYTES_WITHOUT_BLOB;
    if (file.size > maxBytes) {
      throw new Error(token ? "FILE_TOO_LARGE" : "BLOB_REQUIRED");
    }
    if (token) {
      const blob = await put(`agam/${candidateId}/${file.name}`, file, {
        access: "public",
        token,
      });
      return blob.url;
    }
    throw new Error("BLOB_REQUIRED");
  }
}
