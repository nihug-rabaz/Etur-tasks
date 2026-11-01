import { NextResponse } from "next/server";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCandidateMeService } from "@/modules/agam/services/candidate-me.service";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { AgamDocumentService } from "@/modules/agam/services/document.service";
import { DOC_TYPES } from "@/modules/agam/lib/document-types";
import { sanitizeFileName } from "@/modules/agam/lib/file-validation";

export async function GET() {
  const access = await new AgamAccessService().requireCandidateAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const meService = new AgamCandidateMeService();
  const candidate = await meService.resolveForUser(access.profile.id, access.profile.email);
  if (!candidate) {
    return NextResponse.json({ error: "לא נמצא תיק מועמד" }, { status: 404 });
  }

  const payload = await meService.buildPayload(candidate);
  return NextResponse.json({ documents: payload.documents });
}

export async function POST(request: Request) {
  const access = await new AgamAccessService().requireCandidateAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const meService = new AgamCandidateMeService();
  const candidate = await meService.resolveForUser(access.profile.id, access.profile.email);
  if (!candidate) {
    return NextResponse.json({ error: "לא נמצא תיק מועמד" }, { status: 404 });
  }

  const form = await request.formData();
  const documentType = String(form.get("documentType") ?? "").trim();
  const rawFile = form.get("file");
  if (!(rawFile instanceof Blob) || !documentType) {
    return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
  }
  if (!(DOC_TYPES as readonly string[]).includes(documentType)) {
    return NextResponse.json({ error: "סוג מסמך לא תקין" }, { status: 400 });
  }

  const blob = rawFile as Blob;
  const fileName =
    typeof File !== "undefined" && rawFile instanceof File && rawFile.name
      ? rawFile.name
      : `document-${Date.now()}.pdf`;
  const file =
    typeof File !== "undefined" && rawFile instanceof File
      ? rawFile
      : new File([blob], fileName, { type: blob.type || "application/pdf" });

  const documentService = new AgamDocumentService();
  try {
    const fileUrl = await documentService.storeFile(candidate.id, file);
    await documentService.create({
      candidate_id: candidate.id,
      name: sanitizeFileName(file.name),
      file_url: fileUrl,
      document_type: documentType,
      upload_source: "candidate",
      notes: null,
      uploaded_by_name: candidate.full_name,
      file_size: file.size,
      content_type: file.type || null,
    });
    await new AgamCandidateService().addTimeline({
      candidate_id: candidate.id,
      event_type: "document",
      title: `הועלה מסמך ע״י מועמד: ${sanitizeFileName(file.name)}`,
      actor_name: candidate.full_name,
      stage_key: "documents",
    });
    const payload = await meService.buildPayload(candidate);
    return NextResponse.json({ ok: true, documents: payload.documents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UPLOAD_FAILED";
    if (message === "FILE_TOO_LARGE") {
      return NextResponse.json({ error: "הקובץ גדול מדי — עד 4MB" }, { status: 413 });
    }
    if (message === "INVALID_FILE_TYPE" || message === "INVALID_FILE_NAME") {
      return NextResponse.json(
        { error: "סוג קובץ לא נתמך — PDF, Word, Excel או תמונה" },
        { status: 400 },
      );
    }
    console.error("[agam/me/documents] upload failed:", error);
    return NextResponse.json({ error: "העלאה נכשלה" }, { status: 500 });
  }
}
