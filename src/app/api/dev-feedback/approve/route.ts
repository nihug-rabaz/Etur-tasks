import { NextResponse } from "next/server";
import { z } from "zod";
import {
  isDevFeedbackKobiApprover,
  moduleLabel,
  parseModuleIdFromLabels,
  resolveDevAssigneeTarget,
} from "@/modules/dev-feedback/access";
import {
  DEV_FEEDBACK_SLA_BUSINESS_DAYS,
  previewSlaDueDate,
} from "@/modules/dev-feedback/business-days";
import { AuthorizationService } from "@/services/authorization.service";
import { JiraService } from "@/services/jira.service";

export const runtime = "nodejs";

const bodySchema = z.object({
  issueKey: z.string().min(2),
  action: z.enum(["approve", "reject"]),
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
      { error: "רק הרב קובי יכול לאשר או לדחות משימות פיתוח" },
      { status: 403 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const { issueKey, action, notes } = parsed.data;
  const jira = new JiraService();

  try {
    if (action === "reject") {
      const reason = (notes ?? "").trim() || "ללא פירוט";
      await jira.rejectDevFeedback({
        issueKey,
        comment: `נדחה על ידי הרב קובי (${profile.name || profile.email}): ${reason}`,
      });
      return NextResponse.json({ ok: true, action: "reject", issueKey });
    }

    const labels = await jira.assertAwaitingKobi(issueKey);
    const moduleId = parseModuleIdFromLabels(labels);

    const target = resolveDevAssigneeTarget(moduleId);
    const assigneeAccountId =
      target === "liad"
        ? await jira.resolveLiadAccountId()
        : await jira.resolveZoharAccountId();

    const sla = previewSlaDueDate();
    const assigneeName = target === "liad" ? "ליעד" : "זוהר";

    await jira.approveForDev({
      issueKey,
      targetAssigneeAccountId: assigneeAccountId,
      dueDateIso: sla.iso,
      comment:
        `אושר לפיתוח על ידי הרב קובי (${profile.name || profile.email}).` +
        ` שובץ ל${assigneeName}.` +
        ` מודול: ${moduleLabel(moduleId)}.` +
        ` יעד: ${sla.label} (${DEV_FEEDBACK_SLA_BUSINESS_DAYS} ימי עסקים א׳–ה׳ מרגע האישור).` +
        ((notes ?? "").trim() ? ` הערות: ${(notes ?? "").trim()}` : ""),
    });

    return NextResponse.json({
      ok: true,
      action: "approve",
      issueKey,
      assignee: target,
      dueDate: sla.iso,
      dueDateLabel: sla.label,
    });
  } catch (error) {
    console.error("[dev-feedback-approve]", issueKey, error);
    const message =
      error instanceof Error ? error.message : "עדכון Jira נכשל";
    const conflict =
      message.includes("אינה ממתינה") || message.includes("אינה בפרויקט");
    return NextResponse.json(
      { error: message },
      { status: conflict ? 409 : 502 },
    );
  }
}
