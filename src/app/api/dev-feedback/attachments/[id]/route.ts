import { NextResponse } from "next/server";
import { isDevFeedbackKobiApprover } from "@/modules/dev-feedback/access";
import { DevFeedbackPendingService } from "@/modules/dev-feedback/pending.service";
import { AuthorizationService } from "@/services/authorization.service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = new AuthorizationService();
  const profile = await auth.getCurrentProfile();
  if (!profile?.is_approved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isKobi = isDevFeedbackKobiApprover(profile.email);
  const isPlatformAdmin = profile.role === "admin";
  if (!isKobi && !isPlatformAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const attachment = await new DevFeedbackPendingService().getAttachmentForPreview(
    id,
  );
  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(attachment.bytes), {
    status: 200,
    headers: {
      "Content-Type": attachment.contentType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
