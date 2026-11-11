import { NextResponse } from "next/server";
import { z } from "zod";
import { isDevFeedbackKobiApprover } from "@/modules/dev-feedback/access";
import { createApprovedDevFeedbackJira } from "@/modules/dev-feedback/create-jira";
import { DevFeedbackPendingService } from "@/modules/dev-feedback/pending.service";
import { AuthorizationService } from "@/services/authorization.service";

export const runtime = "nodejs";

const bodySchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["approve", "reject", "comment"]),
  notes: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const auth = new AuthorizationService();
  const profile = await auth.getCurrentProfile();
  if (!profile?.is_approved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDevFeedbackKobiApprover(profile.email)) {
    return NextResponse.json(
      { error: "רק הרב קובי יכול לאשר, לדחות או להוסיף הערות" },
      { status: 403 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const { id, action, notes } = parsed.data;
  const reviewerName = profile.name || profile.email || "הרב קובי";
  const pendingService = new DevFeedbackPendingService();

  try {
    const pending = await pendingService.getPending(id);
    if (!pending || pending.status !== "pending") {
      return NextResponse.json(
        { error: "המשימה אינה ממתינה לאישור" },
        { status: 409 },
      );
    }

    if (action === "comment") {
      const text = (notes ?? "").trim();
      if (!text) {
        return NextResponse.json({ error: "נא להזין הערה" }, { status: 400 });
      }
      await pendingService.appendNotes(id, text, reviewerName);
      return NextResponse.json({ ok: true, action: "comment", id });
    }

    if (action === "reject") {
      const reason = (notes ?? "").trim() || "ללא פירוט";
      await pendingService.markRejected({
        id,
        notes: reason,
        reviewerName,
      });
      return NextResponse.json({ ok: true, action: "reject", id });
    }

    const files = await pendingService.loadAttachmentBlobs(id);
    const { issue, sla, assignee, attachErrors } =
      await createApprovedDevFeedbackJira({
        title: pending.title,
        description: pending.description,
        moduleId: pending.module_id,
        pageUrl: pending.page_url,
        profileName: pending.submitter_name || "משתמש",
        profileEmail: pending.submitter_email,
        files,
        approvedByKobiName: reviewerName,
        notes: (notes ?? "").trim() || pending.kobi_notes,
      });

    await pendingService.markApproved({
      id,
      jiraIssueKey: issue.key,
      notes: (notes ?? "").trim() || null,
      reviewerName,
    });

    return NextResponse.json({
      ok: true,
      action: "approve",
      id,
      issueKey: issue.key,
      browseUrl: issue.browseUrl,
      assignee,
      dueDate: sla.iso,
      dueDateLabel: sla.label,
      attachWarnings: attachErrors.length ? attachErrors : undefined,
    });
  } catch (error) {
    console.error("[dev-feedback-approve]", id, error);
    const message =
      error instanceof Error ? error.message : "עדכון המשימה נכשל";
    const conflict = message.includes("אינה ממתינה");
    return NextResponse.json(
      { error: message },
      { status: conflict ? 409 : 502 },
    );
  }
}
