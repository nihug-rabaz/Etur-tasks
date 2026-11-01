import { NextResponse } from "next/server";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCandidateMeService } from "@/modules/agam/services/candidate-me.service";
import { AgamDocumentService } from "@/modules/agam/services/document.service";

export async function GET(request: Request) {
  const accessService = new AgamAccessService();
  const staffAccess = await accessService.requireAgamAccess();
  const isStaff = !("error" in staffAccess);

  let candidateIdAllowed: string | null = null;
  if (!isStaff) {
    const candidateAccess = await accessService.requireCandidateAccess();
    if ("error" in candidateAccess) {
      return NextResponse.json({ error: candidateAccess.error }, { status: candidateAccess.status });
    }
    const linked = await new AgamCandidateMeService().resolveForUser(
      candidateAccess.profile.id,
      candidateAccess.profile.email,
    );
    if (!linked) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    candidateIdAllowed = linked.id;
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "missing" }, { status: 400 });
  }
  const documentService = new AgamDocumentService();
  const document = await documentService.getById(id);
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (candidateIdAllowed && document.candidate_id !== candidateIdAllowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dbFileId = documentService.dbFileId(document.file_url);
  if (dbFileId) {
    const file = await documentService.readDbFile(dbFileId);
    if (!file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";
    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Length": String(file.bytes.length),
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(document.name)}`,
        "Cache-Control": "private, max-age=300",
      },
    });
  }
  return NextResponse.redirect(documentService.resolveDownloadUrl(document.file_url));
}
