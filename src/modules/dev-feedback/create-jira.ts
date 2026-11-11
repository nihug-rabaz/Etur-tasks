import {
  moduleLabel,
  resolveDevAssigneeTarget,
} from "@/modules/dev-feedback/constants";
import {
  DEV_FEEDBACK_SLA_BUSINESS_DAYS,
  previewSlaDueDate,
} from "@/modules/dev-feedback/business-days";
import { JiraService } from "@/services/jira.service";

export async function createApprovedDevFeedbackJira(input: {
  title: string;
  description: string;
  moduleId: string;
  pageUrl?: string | null;
  profileName: string;
  profileEmail?: string | null;
  files: { blob: Blob; name: string }[];
  approvedByKobiName?: string;
  notes?: string | null;
  openedDirectlyByKobi?: boolean;
}) {
  const jira = new JiraService();
  const target = resolveDevAssigneeTarget(input.moduleId);
  const assigneeAccountId =
    target === "liad"
      ? await jira.resolveLiadAccountId()
      : await jira.resolveZoharAccountId();
  const sla = previewSlaDueDate();
  const assigneeName = target === "liad" ? "ליעד" : "זוהר";

  const descriptionLines = [
    input.openedDirectlyByKobi
      ? "נפתח ישירות לפיתוח על ידי הרב קובי (ללא תור אישור)."
      : input.approvedByKobiName
        ? `אושר לפיתוח על ידי ${input.approvedByKobiName}.`
        : "אושר לפיתוח.",
    `מודול: ${moduleLabel(input.moduleId)} (${input.moduleId})`,
    input.pageUrl ? `כתובת מסך: ${input.pageUrl}` : "",
    `מדווח: ${input.profileName}${input.profileEmail ? ` <${input.profileEmail}>` : ""}`,
    "",
    "תיאור הבקשה:",
    input.description,
    "",
    `שובץ ל${assigneeName}. יעד: ${sla.label} (${DEV_FEEDBACK_SLA_BUSINESS_DAYS} ימי עסקים א׳–ה׳ מרגע האישור/פתיחה על ידי קובי).`,
    input.notes ? `הערות קובי: ${input.notes}` : "",
  ].filter(Boolean);

  const issue = await jira.createDevFeedbackIssue({
    summary: `[פיתוח] ${input.title}`,
    descriptionLines,
    moduleId: input.moduleId,
    assigneeAccountId,
    awaitingKobi: false,
    approved: true,
    dueDateIso: sla.iso,
  });

  const attachErrors: string[] = [];
  for (const file of input.files) {
    try {
      await jira.addAttachment(issue.key, file.blob, file.name);
    } catch (error) {
      console.error("[dev-feedback-attach]", issue.key, file.name, error);
      attachErrors.push(file.name);
    }
  }

  return {
    issue,
    sla,
    assignee: target as "liad" | "zohar",
    attachErrors,
  };
}
