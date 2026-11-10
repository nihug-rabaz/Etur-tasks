import { NextResponse } from "next/server";
import { isDevFeedbackKobiApprover } from "@/modules/dev-feedback/access";
import { AuthorizationService } from "@/services/authorization.service";
import { JiraService } from "@/services/jira.service";

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
    const issues = await new JiraService().listAwaitingKobiApproval();
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
