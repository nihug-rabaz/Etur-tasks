import { AuthorizationService } from "@/services/authorization.service";
import { ImpersonationService } from "@/services/impersonation.service";
import { ModuleRoleService } from "@/shared/services/module-role.service";
import { AppSettingsService } from "@/services/app-settings.service";
import type { ModuleAccessContext, ModuleRole } from "@/shared/modules/types";
import type { Profile } from "@/types/models";

/** Temporary allowlist until platform admin one-shot release. */
export const ASSISTANT_PREVIEW_EMAIL = "admin@rabaz-idf.com";

export type AssistantAccessOk = {
  ok: true;
  profile: Profile;
  isPlatformAdmin: boolean;
  moduleRoles: Record<string, ModuleRole>;
  access: ModuleAccessContext;
  released: boolean;
};

export type AssistantAccessDenied = {
  ok: false;
  error: "Unauthorized" | "Forbidden" | "Impersonating" | "NotReleased";
  status: 401 | 403;
};

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export class AssistantAccessService {
  private readonly authorizationService = new AuthorizationService();
  private readonly moduleRoleService = new ModuleRoleService();
  private readonly impersonationService = new ImpersonationService();
  private readonly appSettingsService = new AppSettingsService();

  public async requireAccess(): Promise<AssistantAccessOk | AssistantAccessDenied> {
    const profile = await this.authorizationService.getRealProfile();
    if (!profile) {
      return { ok: false, error: "Unauthorized", status: 401 };
    }
    if (!profile.is_approved) {
      return { ok: false, error: "Forbidden", status: 403 };
    }

    const snapshot = await this.impersonationService.getSnapshot();
    if (snapshot.active) {
      return { ok: false, error: "Impersonating", status: 403 };
    }

    const moduleRoles = await this.moduleRoleService.getRolesForUser(profile.id);
    const isPlatformAdmin = profile.role === "admin";
    const hasRamad = Object.values(moduleRoles).some((role) => role === "ramad");

    if (!isPlatformAdmin && !hasRamad) {
      return { ok: false, error: "Forbidden", status: 403 };
    }

    const released = await this.appSettingsService.getAssistantReleased();
    const email = normalizeEmail(profile.email);
    const isPreviewUser = email === ASSISTANT_PREVIEW_EMAIL;

    if (!released && !isPreviewUser) {
      return { ok: false, error: "NotReleased", status: 403 };
    }

    return {
      ok: true,
      profile,
      isPlatformAdmin,
      moduleRoles,
      released,
      access: {
        isPlatformAdmin,
        moduleRoles,
      },
    };
  }
}
