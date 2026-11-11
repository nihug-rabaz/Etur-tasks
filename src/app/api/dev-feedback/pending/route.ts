import { NextResponse } from "next/server";
import { isDevFeedbackKobiApprover } from "@/modules/dev-feedback/access";
import { DevFeedbackPendingService } from "@/modules/dev-feedback/pending.service";
import { AuthorizationService } from "@/services/authorization.service";

export const runtime = "nodejs";

export async function GET() {
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

  try {
    const rows = await new DevFeedbackPendingService().listPending();
    const issues = rows.map((row) => ({
      id: row.id,
      key: row.id,
      summary: row.title,
      description: row.description,
      moduleId: row.module_id,
      created: row.created_at,
      reporterName: row.submitter_name,
      pageUrl: row.page_url,
      kobiNotes: row.kobi_notes,
      attachments: row.attachments,
      browseUrl: null as string | null,
    }));
    return NextResponse.json({
      issues,
      canApprove: isKobi,
      isKobi,
    });
  } catch (error) {
    console.error("[dev-feedback-pending]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "טעינת ממתינים נכשלה",
      },
      { status: 502 },
    );
  }
}
