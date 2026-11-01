import { BaseService } from "@/services/base.service";
import { ModuleRoleService } from "@/shared/services/module-role.service";
import { normalizeEmail } from "@/modules/agam/lib/email";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";

/**
 * Links a Google login to an Agam candidate by the email from the questionnaire.
 * Auto-approves the profile and grants the candidate-soldier module role.
 */
export class AgamCandidateLinkService extends BaseService {
  private readonly candidates = new AgamCandidateService();
  private readonly moduleRoles = new ModuleRoleService();

  public async linkByEmail(emailRaw: string, userId: string): Promise<boolean> {
    const email = normalizeEmail(emailRaw);
    if (!email || !userId) return false;

    const candidate = await this.candidates.findByEmail(email);
    if (!candidate || candidate.archived) return false;

    // Already linked to someone else — do not steal the file.
    if (candidate.linked_user_id && candidate.linked_user_id !== userId) {
      return false;
    }

    if (!candidate.linked_user_id) {
      await this.candidates.setLinkedUser(candidate.id, userId);
    }

    const roles = await this.moduleRoles.getRolesForUser(userId);
    const existingAgam = roles.agam;
    // Never downgrade staff; only grant candidate when they have no Agam role yet.
    if (!existingAgam) {
      await this.moduleRoles.setRole(userId, "agam", "candidate");
    } else if (existingAgam !== "candidate") {
      return true;
    }

    await this.approveForCandidatePortal(userId);
    return true;
  }

  private async approveForCandidatePortal(userId: string): Promise<void> {
    const db = this.getDb();
    await db`
      update profiles
      set
        is_approved = true,
        access_status = 'approved',
        approved_at = coalesce(approved_at, now())
      where id = ${userId}
        and is_approved = false
    `;
  }
}
