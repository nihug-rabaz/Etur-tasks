import { NextResponse } from "next/server";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { AgamDocumentService } from "@/modules/agam/services/document.service";

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
  const documentService = new AgamDocumentService();
  try {
    const fileUrl = await documentService.storeFile(candidateId, file);
    await documentService.create({
      candidate_id: candidateId,
      name: file.name,
      file_url: fileUrl,
      document_type: documentType || null,
      upload_source: accessService.uploadSourceFor(access.role),
      notes: notes || null,
      uploaded_by_name: access.profile.name,
    });
    await new AgamCandidateService().addTimeline({
      candidate_id: candidateId,
      event_type: "document",
      title: `הועלה מסמך: ${file.name}`,
      actor_name: access.profile.name,
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
  const body = (await request.json().catch(() => null)) as { id?: string; notes?: string } | null;
  if (!body?.id) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  await new AgamDocumentService().updateNotes(body.id, body.notes ?? "");
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
  await new AgamDocumentService().delete(id);
  return NextResponse.json({ ok: true });
}
