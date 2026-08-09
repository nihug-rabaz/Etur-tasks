import {
  resolveEffectiveUserId,
  resolveRealAuthenticatedUserId,
} from "@/lib/auth/session-user";
import { BaseService } from "@/services/base.service";
import { ImpersonationService } from "@/services/impersonation.service";
import { Profile, Subtopic } from "@/types/models";
import { redirect } from "next/navigation";

export interface TaskAccessContext {
  unrestricted: boolean;
  userId: string;
}

export class AuthorizationService extends BaseService {
  private async ensureAnyAdminExists(currentUserId?: string): Promise<void> {
    const db = this.getDb();
    const adminCountRows = await db<Array<{ count: number }>>`
      select count(*)::int as count from profiles where role = 'admin'
    `;
    const adminCount = adminCountRows[0]?.count ?? 0;
    if (adminCount > 0 || !currentUserId) {
      return;
    }
    await db`
      update profiles
      set role = 'admin', is_approved = true, access_status = 'approved', approved_at = now(), approved_by = null
      where id = ${currentUserId}
    `;
  }

  private async loadProfileById(userId: string): Promise<Profile | null> {
    const db = this.getDb();
    const profiles = await db<Profile[]>`
      select id, name, role, telegram_id, avatar, is_approved, access_status, approved_at, approved_by, created_at
      from profiles
      where id = ${userId}
      limit 1
    `;
    return profiles[0] ?? null;
  }

  public async getRealProfile(): Promise<Profile | null> {
    const userId = await resolveRealAuthenticatedUserId();
    if (!userId) {
      return null;
    }
    return this.loadProfileById(userId);
  }

  public async getCurrentProfile(): Promise<Profile | null> {
    const userId = await resolveEffectiveUserId();
    if (!userId) {
      return null;
    }
    return this.loadProfileById(userId);
  }

  public async ensureAuthenticated(): Promise<Profile> {
    const profile = await this.getCurrentProfile();
    if (!profile) {
      redirect("/login");
    }
    const realProfile = await this.getRealProfile();
    await this.ensureAnyAdminExists(realProfile?.id);
    const refreshedProfile = await this.getCurrentProfile();
    if (!refreshedProfile) {
      redirect("/login");
    }
    return refreshedProfile;
  }

  public async ensureApproved(): Promise<Profile> {
    const profile = await this.ensureAuthenticated();
    if (!profile.is_approved) {
      redirect("/pending-approval");
    }
    return profile;
  }

  public async ensureAdmin(): Promise<Profile> {
    const profile = await this.getRealProfile();
    if (!profile) {
      redirect("/login");
    }
    if (!profile.is_approved) {
      redirect("/pending-approval");
    }
    if (profile.role !== "admin") {
      redirect("/dashboard");
    }
    return profile;
  }

  public async getTaskAccessContext(profile: Profile): Promise<TaskAccessContext> {
    const snapshot = await new ImpersonationService().getSnapshot();
    const impersonating = snapshot.active && snapshot.target?.id === profile.id;
    return {
      unrestricted: profile.role === "admin" && !impersonating,
      userId: profile.id,
    };
  }

  public canCloseTask(profile: Profile): boolean {
    return profile.role === "admin";
  }

  public async canAccessTask(profile: Profile, taskId: string): Promise<boolean> {
    const access = await this.getTaskAccessContext(profile);
    if (access.unrestricted) return true;
    const db = this.getDb();
    const linked = await db<Array<{ subtopic_id: string }>>`
      select subtopic_id from task_subtopics where task_id = ${taskId}
    `;
    const subtopicIds =
      linked.length > 0
        ? linked.map((row) => row.subtopic_id)
        : (
            await db<Array<{ subtopic_id: string }>>`
              select subtopic_id from tasks where id = ${taskId} limit 1
            `
          ).map((row) => row.subtopic_id);
    for (const subtopicId of subtopicIds) {
      if (await this.canAccessSubtopic(profile.id, subtopicId)) return true;
    }
    return false;
  }

  public async canAccessProject(profile: Profile, projectId: string): Promise<boolean> {
    const access = await this.getTaskAccessContext(profile);
    if (access.unrestricted) return true;
    const db = this.getDb();
    const linked = await db<Array<{ subtopic_id: string }>>`
      select subtopic_id from project_subtopics where project_id = ${projectId}
    `;
    const subtopicIds =
      linked.length > 0
        ? linked.map((row) => row.subtopic_id)
        : (
            await db<Array<{ subtopic_id: string }>>`
              select subtopic_id from projects where id = ${projectId} limit 1
            `
          ).map((row) => row.subtopic_id);
    for (const subtopicId of subtopicIds) {
      if (await this.canAccessSubtopic(profile.id, subtopicId)) return true;
    }
    return false;
  }

  public async canAccessAllSubtopics(userId: string, subtopicIds: string[]): Promise<boolean> {
    for (const subtopicId of subtopicIds) {
      if (!(await this.canAccessSubtopic(userId, subtopicId))) return false;
    }
    return subtopicIds.length > 0;
  }

  public async canAccessCalendarEvent(profile: Profile, eventId: string): Promise<boolean> {
    const access = await this.getTaskAccessContext(profile);
    if (access.unrestricted) return true;
    const db = this.getDb();
    const rows = await db<Array<{ subtopic_id: string }>>`
      select subtopic_id from calendar_events where id = ${eventId} limit 1
    `;
    const event = rows[0];
    if (!event) return false;
    return this.canAccessSubtopic(profile.id, event.subtopic_id);
  }

  public async canAccessSubtopic(userId: string, subtopicId: string): Promise<boolean> {
    const profile = await this.loadProfileById(userId);
    if (!profile) return false;
    const access = await this.getTaskAccessContext(profile);
    if (access.unrestricted) return true;

    const db = this.getDb();
    const rows = await db<Array<{ user_id: string }>>`
      select user_id
      from user_subtopic_permissions
      where user_id = ${userId} and subtopic_id = ${subtopicId}
      limit 1
    `;
    return rows.length > 0;
  }

  public async getAccessibleSubtopics(profile: Profile): Promise<Subtopic[]> {
    const access = await this.getTaskAccessContext(profile);
    const db = this.getDb();
    if (access.unrestricted) {
      return db<Subtopic[]>`
        select id, name, domain_id from subtopics order by name
      `;
    }
    return db<Subtopic[]>`
      select s.id, s.name, s.domain_id
      from subtopics s
      join user_subtopic_permissions usp on usp.subtopic_id = s.id
      where usp.user_id = ${profile.id}
      order by s.name
    `;
  }

  public async getAccessibleSubtopicsInDomain(profile: Profile, domainId: string): Promise<Subtopic[]> {
    const access = await this.getTaskAccessContext(profile);
    const db = this.getDb();
    if (access.unrestricted) {
      return db<Subtopic[]>`
        select id, name, domain_id
        from subtopics
        where domain_id = ${domainId}
        order by name
      `;
    }
    return db<Subtopic[]>`
      select s.id, s.name, s.domain_id
      from subtopics s
      join user_subtopic_permissions usp on usp.subtopic_id = s.id
      where usp.user_id = ${profile.id} and s.domain_id = ${domainId}
      order by s.name
    `;
  }

  public async ensureRealAdminApi(): Promise<Profile | null> {
    const profile = await this.getRealProfile();
    if (!profile?.is_approved || profile.role !== "admin") {
      return null;
    }
    return profile;
  }

  public requireApprovedProfile(profile: Profile): Profile {
    if (!profile.is_approved) {
      throw new Error("Awaiting admin approval");
    }
    return profile;
  }
}
