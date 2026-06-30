import { AuthorizationService } from "@/services/authorization.service";
import { Profile } from "@/types/models";

export type ProfileEditAccess =
  | { ok: true; actor: Profile }
  | { ok: false; status: 401 | 403 | 404 };

export async function resolveProfileEditAccess(targetUserId: string): Promise<ProfileEditAccess> {
  const authorizationService = new AuthorizationService();
  const actor = await authorizationService.getCurrentProfile();
  if (!actor) {
    return { ok: false, status: 401 };
  }
  if (!actor.is_approved) {
    return { ok: false, status: 403 };
  }
  if (actor.id !== targetUserId && actor.role !== "admin") {
    return { ok: false, status: 403 };
  }
  return { ok: true, actor };
}
