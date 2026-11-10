import { NextResponse } from "next/server";
import {
  canSubmitDevFeedback,
  isDevFeedbackKobiApprover,
} from "@/modules/dev-feedback/access";
import { previewSlaDueDate } from "@/modules/dev-feedback/business-days";
import { AuthorizationService } from "@/services/authorization.service";
import { ModuleRoleService } from "@/shared/services/module-role.service";
import { resolveActiveModuleId } from "@/shared/modules/types";

export async function GET(request: Request) {
  const auth = new AuthorizationService();
  const profile = await auth.getCurrentProfile();
  if (!profile?.is_approved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const pathname = url.searchParams.get("pathname") || "/";
  const moduleId = resolveActiveModuleId(pathname) || "tasks";
  const roles = await new ModuleRoleService().getRolesForUser(profile.id);
  const isPlatformAdmin = profile.role === "admin";
  const access = { isPlatformAdmin, moduleRoles: roles };
  const canSubmit = canSubmitDevFeedback(access, moduleId);
  const isKobi = isDevFeedbackKobiApprover(profile.email);
  const sla = previewSlaDueDate();

  return NextResponse.json({
    canSubmit,
    isKobi,
    isPlatformAdmin,
    moduleId,
    slaPreviewIso: sla.iso,
    slaPreviewLabel: sla.label,
  });
}
