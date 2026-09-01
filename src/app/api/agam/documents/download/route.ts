import { NextResponse } from "next/server";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamDocumentService } from "@/modules/agam/services/document.service";

export async function GET(request: Request) {
  const access = await new AgamAccessService().requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
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
  const downloadUrl = documentService.resolveDownloadUrl(document.file_url);
  return NextResponse.redirect(downloadUrl);
}
