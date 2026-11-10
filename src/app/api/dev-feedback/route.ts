import { NextResponse } from "next/server";
import {
  canSubmitDevFeedback,
  moduleLabel,
} from "@/modules/dev-feedback/access";
import { previewSlaDueDate } from "@/modules/dev-feedback/business-days";
import { AuthorizationService } from "@/services/authorization.service";
import { JiraService } from "@/services/jira.service";
import { ModuleRoleService } from "@/shared/services/module-role.service";
import { resolveActiveModuleId } from "@/shared/modules/types";

export const runtime = "nodejs";

const MAX_FILES = 6;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = new AuthorizationService();
  const profile = await auth.getCurrentProfile();
  if (!profile?.is_approved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roles = await new ModuleRoleService().getRolesForUser(profile.id);
  const isPlatformAdmin = profile.role === "admin";
  const access = { isPlatformAdmin, moduleRoles: roles };

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const title = String(form.get("title") || "").trim();
  const description = String(form.get("description") || "").trim();
  const pageUrl = String(form.get("pageUrl") || "").trim();
  let moduleId = String(form.get("moduleId") || "").trim();
  if (!moduleId && pageUrl) {
    try {
      moduleId = resolveActiveModuleId(new URL(pageUrl).pathname) || "tasks";
    } catch {
      moduleId = "tasks";
    }
  }
  if (!moduleId) moduleId = "tasks";

  if (!canSubmitDevFeedback(access, moduleId)) {
    return NextResponse.json(
      { error: "אין הרשאה לפתוח משימת פיתוח במודול זה" },
      { status: 403 },
    );
  }

  if (!title || title.length < 3) {
    return NextResponse.json({ error: "נא להזין כותרת" }, { status: 400 });
  }
  if (!description || description.length < 5) {
    return NextResponse.json({ error: "נא להזין תיאור" }, { status: 400 });
  }

  const files: { blob: Blob; name: string }[] = [];
  for (const [key, value] of form.entries()) {
    if (!(value instanceof Blob) || value.size === 0) continue;
    if (!key.startsWith("file") && key !== "screenshot") continue;
    if (value.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "קובץ גדול מדי (מקסימום 8MB)" },
        { status: 400 },
      );
    }
    const name =
      value instanceof File && value.name
        ? value.name
        : key === "screenshot"
          ? "screenshot.png"
          : `attachment-${files.length + 1}`;
    files.push({ blob: value, name });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `ניתן לצרף עד ${MAX_FILES} קבצים` },
      { status: 400 },
    );
  }

  const jira = new JiraService();
  const kobiAccountId = await jira.resolveKobiAccountId().catch(() => null);
  const slaPreview = previewSlaDueDate();

  const descriptionLines = [
    "⚠️ המשימה דורשת אישור של הרב קובי לפני שהיא מגיעה לצוות הפיתוח.",
    `מודול: ${moduleLabel(moduleId)} (${moduleId})`,
    pageUrl ? `כתובת מסך: ${pageUrl}` : "",
    `מדווח: ${profile.name || "משתמש"}${profile.email ? ` <${profile.email}>` : ""}`,
    "",
    "תיאור הבקשה:",
    description,
    "",
    `מחשבון SLA: לאחר אישור הרב קובי — יעד משוער של ${slaPreview.label} (4 ימי עסקים א׳–ה׳ מרגע האישור).`,
  ].filter(Boolean);

  try {
    const issue = await jira.createDevFeedbackIssue({
      summary: `[פיתוח] ${title}`,
      descriptionLines,
      moduleId,
      assigneeAccountId: kobiAccountId,
    });

    const attachErrors: string[] = [];
    for (const file of files) {
      try {
        await jira.addAttachment(issue.key, file.blob, file.name);
      } catch (error) {
        console.error("[dev-feedback-attach]", issue.key, file.name, error);
        attachErrors.push(file.name);
      }
    }

    if (files.length > 0 && attachErrors.length === files.length) {
      return NextResponse.json(
        {
          error: `המשימה ${issue.key} נוצרה אך צירוף הקבצים נכשל`,
          issueKey: issue.key,
          browseUrl: issue.browseUrl,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      issueKey: issue.key,
      browseUrl: issue.browseUrl,
      awaitingKobi: true,
      slaPreviewIso: slaPreview.iso,
      slaPreviewLabel: slaPreview.label,
      assignedToKobi: issue.assignedToKobi,
      attachWarnings: attachErrors.length ? attachErrors : undefined,
    });
  } catch (error) {
    console.error("[dev-feedback-create]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "יצירת משימה ב־Jira נכשלה",
      },
      { status: 502 },
    );
  }
}
