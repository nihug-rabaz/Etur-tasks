import { NextResponse } from "next/server";
import {
  canSubmitDevFeedback,
  isDevFeedbackKobiApprover,
  isDevFeedbackModuleId,
  suggestDevFeedbackModuleId,
} from "@/modules/dev-feedback/access";
import { createApprovedDevFeedbackJira } from "@/modules/dev-feedback/create-jira";
import { DevFeedbackPendingService } from "@/modules/dev-feedback/pending.service";
import { AuthorizationService } from "@/services/authorization.service";
import { ModuleRoleService } from "@/shared/services/module-role.service";
import { resolveActiveModuleId } from "@/shared/modules/types";

export const runtime = "nodejs";

const MAX_FILES = 6;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

function collectFiles(form: FormData) {
  const files: { blob: Blob; name: string }[] = [];
  for (const [key, value] of form.entries()) {
    if (!(value instanceof Blob) || value.size === 0) continue;
    if (!key.startsWith("file") && key !== "screenshot") continue;
    if (value.size > MAX_FILE_BYTES) {
      throw new Error("קובץ גדול מדי (מקסימום 8MB)");
    }
    const name =
      value instanceof File && value.name
        ? value.name
        : key === "screenshot"
          ? "screenshot.jpg"
          : `attachment-${files.length + 1}`;
    files.push({ blob: value, name });
  }
  if (files.length > MAX_FILES) {
    throw new Error(`ניתן לצרף עד ${MAX_FILES} קבצים`);
  }
  return files;
}

export async function POST(request: Request) {
  const auth = new AuthorizationService();
  const profile = await auth.getCurrentProfile();
  if (!profile?.is_approved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roles = await new ModuleRoleService().getRolesForUser(profile.id);
  const isPlatformAdmin = profile.role === "admin";
  const access = { isPlatformAdmin, moduleRoles: roles };
  const isKobi = isDevFeedbackKobiApprover(profile.email);

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
      const path = new URL(pageUrl).pathname;
      const resolved = resolveActiveModuleId(path);
      moduleId = isDevFeedbackModuleId(resolved || "")
        ? (resolved as string)
        : suggestDevFeedbackModuleId(path);
    } catch {
      moduleId = "malshabim";
    }
  }
  if (!isDevFeedbackModuleId(moduleId)) {
    moduleId = suggestDevFeedbackModuleId(pageUrl);
  }

  if (!isKobi && !canSubmitDevFeedback(access, moduleId)) {
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

  let files: { blob: Blob; name: string }[];
  try {
    files = collectFiles(form);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "קבצים לא תקינים" },
      { status: 400 },
    );
  }

  if (isKobi) {
    try {
      const { issue, sla, assignee, attachErrors } =
        await createApprovedDevFeedbackJira({
          title,
          description,
          moduleId,
          pageUrl,
          profileName: profile.name || "הרב קובי",
          profileEmail: profile.email || "",
          files,
          openedDirectlyByKobi: true,
        });
      return NextResponse.json({
        ok: true,
        status: "approved",
        issueKey: issue.key,
        browseUrl: issue.browseUrl,
        awaitingKobi: false,
        assignee,
        dueDate: sla.iso,
        dueDateLabel: sla.label,
        attachWarnings: attachErrors.length ? attachErrors : undefined,
      });
    } catch (error) {
      console.error("[dev-feedback-kobi-create]", error);
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

  try {
    const pending = await new DevFeedbackPendingService().createPending({
      title,
      description,
      moduleId,
      pageUrl,
      submitterId: profile.id,
      submitterName: profile.name || null,
      submitterEmail: profile.email || null,
      files,
    });
    return NextResponse.json({
      ok: true,
      status: "pending",
      pendingId: pending.id,
      awaitingKobi: true,
      message: "נשמר וממתין לאישור הרב קובי — עדיין לא נפתח כרטיס ב־Jira",
    });
  } catch (error) {
    console.error("[dev-feedback-pending-create]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "שמירת המשימה הממתינה נכשלה",
      },
      { status: 502 },
    );
  }
}
