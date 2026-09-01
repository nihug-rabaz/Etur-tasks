import { NextResponse } from "next/server";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { AgamDocumentService } from "@/modules/agam/services/document.service";
import { checkRateLimit, clientIp } from "@/modules/agam/lib/rate-limit";
import { verifyPublicUploadToken } from "@/modules/agam/lib/public-upload-token";
import { sanitizeFileName } from "@/modules/agam/lib/file-validation";

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!checkRateLimit(`agam-upload:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "יותר מדי בקשות" }, { status: 429 });
  }
  const form = await request.formData();
  const candidateId = String(form.get("candidateId") ?? "");
  const uploadToken = String(form.get("uploadToken") ?? "");
  const documentType = String(form.get("documentType") ?? "");
  const file = form.get("file");
  if (!candidateId || !uploadToken || !documentType || !(file instanceof File)) {
    return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
  }
  if (!verifyPublicUploadToken(candidateId, uploadToken)) {
    return NextResponse.json({ error: "אימות פג תוקף — נא לאמת מחדש" }, { status: 403 });
  }
  const candidateService = new AgamCandidateService();
  const candidate = await candidateService.getById(candidateId);
  if (!candidate) {
    return NextResponse.json({ error: "מועמד לא נמצא" }, { status: 404 });
  }
  const documentService = new AgamDocumentService();
  try {
    const fileUrl = await documentService.storeFile(candidateId, file);
    await documentService.create({
      candidate_id: candidateId,
      name: sanitizeFileName(file.name),
      file_url: fileUrl,
      document_type: documentType,
      upload_source: "candidate",
      notes: null,
      uploaded_by_name: candidate.full_name,
    });
    await candidateService.addTimeline({
      candidate_id: candidateId,
      event_type: "document",
      title: `הועלה מסמך ע״י מועמד: ${sanitizeFileName(file.name)}`,
      actor_name: candidate.full_name,
      stage_key: "documents",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UPLOAD_FAILED";
    if (message === "BLOB_REQUIRED") {
      return NextResponse.json({ error: "העלאת קבצים דורשת אחסון מוגדר בשרת" }, { status: 503 });
    }
    if (message === "FILE_TOO_LARGE") {
      return NextResponse.json({ error: "הקובץ גדול מדי" }, { status: 413 });
    }
    if (message === "INVALID_FILE_TYPE" || message === "INVALID_FILE_NAME") {
      return NextResponse.json({ error: "סוג קובץ לא נתמך" }, { status: 400 });
    }
    return NextResponse.json({ error: "העלאה נכשלה" }, { status: 500 });
  }
}
