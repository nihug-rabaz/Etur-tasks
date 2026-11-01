import { NextResponse } from "next/server";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { AgamDocumentService } from "@/modules/agam/services/document.service";
import { sanitizeFileName } from "@/modules/agam/lib/file-validation";

export async function POST(request: Request) {
  const accessService = new AgamAccessService();
  const access = await accessService.requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!accessService.canEvaluate(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const form = await request.formData();
  const candidateId = String(form.get("candidateId") ?? "");
  const documentType = String(form.get("documentType") ?? "");
  const notes = String(form.get("notes") ?? "");
  const file = form.get("file");
  if (!candidateId || !(file instanceof File)) {
    return NextResponse.json({ error: "INVALID" }, { status: 400 });
  }
  const candidate = await new AgamCandidateService().getById(candidateId);
  if (!candidate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const documentService = new AgamDocumentService();
  try {
    const fileUrl = await documentService.storeFile(candidateId, file);
    await documentService.create({
      candidate_id: candidateId,
      name: sanitizeFileName(file.name),
      file_url: fileUrl,
      document_type: documentType || null,
      upload_source: accessService.uploadSourceFor(access.role),
      notes: notes || null,
      uploaded_by_name: access.profile.name,
      file_size: file.size,
      content_type: file.type || null,
    });
    await new AgamCandidateService().addTimeline({
      candidate_id: candidateId,
      event_type: "document",
      title: `הועלה מסמך: ${sanitizeFileName(file.name)}`,
      actor_name: access.profile.name,
      stage_key: "documents",
    });
    return NextResponse.json({ ok: true });
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
    console.error("[agam/documents] upload failed:", error);
    return NextResponse.json({ error: "העלאה נכשלה" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const accessService = new AgamAccessService();
  const access = await accessService.requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!accessService.canEvaluate(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as
    | { id?: string; notes?: string; approved?: boolean }
    | null;
  if (!body?.id) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const documentService = new AgamDocumentService();
  const document = await documentService.getById(body.id);
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const candidate = await new AgamCandidateService().getById(document.candidate_id);
  if (!candidate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (typeof body.approved === "boolean") {
    if (!accessService.canRamad(access.role)) {
      return NextResponse.json({ error: "רק מנהל יכול לאשר מסמכים" }, { status: 403 });
    }
    await documentService.setApproval(body.id, body.approved ? access.profile.name || "מנהל" : null);
    await new AgamCandidateService().addTimeline({
      candidate_id: document.candidate_id,
      event_type: "document",
      title: `${body.approved ? "אושר" : "בוטל אישור"} מסמך: ${document.document_type ?? document.name}`,
      actor_name: access.profile.name,
      stage_key: "documents",
    });
    return NextResponse.json({ ok: true });
  }
  const ok = await documentService.updateNotes(body.id, body.notes ?? "");
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const accessService = new AgamAccessService();
  const access = await accessService.requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!accessService.canEvaluate(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "missing" }, { status: 400 });
  }
  const documentService = new AgamDocumentService();
  const document = await documentService.getById(id);
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!accessService.canRamad(access.role) && document.upload_source === "candidate") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const ok = await documentService.delete(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await new AgamCandidateService().addTimeline({
    candidate_id: document.candidate_id,
    event_type: "document",
    title: `נמחק מסמך: ${document.name}`,
    actor_name: access.profile.name,
    stage_key: "documents",
  });
  return NextResponse.json({ ok: true });
}
