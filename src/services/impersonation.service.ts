import { ImpersonationManager } from "@/lib/auth/impersonation";
import { resolveRealAuthenticatedUserId } from "@/lib/auth/session-user";
import { BaseService } from "@/services/base.service";
import { Profile } from "@/types/models";

export interface ImpersonationSnapshot {
  active: boolean;
  actor: Pick<Profile, "id" | "name" | "role"> | null;
  target: Pick<Profile, "id" | "name" | "role" | "avatar"> | null;
}

export class ImpersonationService extends BaseService {
  public async getSnapshot(): Promise<ImpersonationSnapshot> {
    const actorId = await resolveRealAuthenticatedUserId();
    if (!actorId) {
      return { active: false, actor: null, target: null };
    }

    const actor = await this.loadProfileSummary(actorId);
    if (!actor || actor.role !== "admin") {
      return { active: false, actor, target: null };
    }

    const targetId = await ImpersonationManager.getTargetUserId();
    if (!targetId || targetId === actorId) {
      return { active: false, actor, target: null };
    }

    const target = await this.loadProfileSummary(targetId);
    if (!target || target.role === "admin") {
      await ImpersonationManager.clear();
      return { active: false, actor, target: null };
    }

    return { active: true, actor, target };
  }

  public async start(actorId: string, targetUserId: string): Promise<ImpersonationSnapshot> {
    if (actorId === targetUserId) {
      throw new Error("Cannot impersonate yourself");
    }

    const actor = await this.loadProfileSummary(actorId);
    if (!actor || actor.role !== "admin") {
      throw new Error("Forbidden");
    }

    const target = await this.loadProfileSummary(targetUserId);
    if (!target) {
      throw new Error("User not found");
    }
    if (target.role === "admin") {
      throw new Error("Cannot impersonate another admin");
    }
    if (!target.is_approved) {
      throw new Error("User is not approved");
    }

    await ImpersonationManager.setTargetUserId(targetUserId);
    return this.getSnapshot();
  }

  public async stop(actorId: string): Promise<ImpersonationSnapshot> {
    const actor = await this.loadProfileSummary(actorId);
    if (!actor || actor.role !== "admin") {
      throw new Error("Forbidden");
    }
    await ImpersonationManager.clear();
    return this.getSnapshot();
  }

  private async loadProfileSummary(userId: string) {
    const db = this.getDb();
    const rows = await db<
      Array<Pick<Profile, "id" | "name" | "role" | "avatar" | "is_approved">>
    >`
      select id, name, role, avatar, is_approved
      from profiles
      where id = ${userId}
      limit 1
    `;
    return rows[0] ?? null;
  }
}
