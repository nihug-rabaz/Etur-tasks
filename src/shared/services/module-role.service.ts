import { BaseService } from "@/services/base.service";
import type { ModuleRole } from "@/shared/modules/types";

export class ModuleRoleService extends BaseService {
  public async getRolesForUser(userId: string): Promise<Record<string, ModuleRole>> {
    const db = this.getDb();
    try {
      const rows = await db<{ module_id: string; role: ModuleRole }[]>`
        select module_id, role
        from user_module_roles
        where user_id = ${userId}
      `;
      const map: Record<string, ModuleRole> = {};
      for (const row of rows) map[row.module_id] = row.role;
      if (!map.tasks) map.tasks = "user";
      return map;
    } catch {
      return { tasks: "user" };
    }
  }

  public async setRole(userId: string, moduleId: string, role: ModuleRole): Promise<void> {
    const db = this.getDb();
    await db`
      insert into user_module_roles (user_id, module_id, role, updated_at)
      values (${userId}, ${moduleId}, ${role}, now())
      on conflict (user_id, module_id)
      do update set role = excluded.role, updated_at = now()
    `;
  }

  public async listModuleUsers(moduleId: string): Promise<
    { user_id: string; name: string; email: string | null; role: ModuleRole }[]
  > {
    const db = this.getDb();
    return db`
      select umr.user_id, p.name, p.email, umr.role
      from user_module_roles umr
      join profiles p on p.id = umr.user_id
      where umr.module_id = ${moduleId}
      order by p.name asc
    `;
  }

  public async ensureDefaultAccess(userId: string, platformRole: string): Promise<void> {
    const db = this.getDb();
    const taskRole = platformRole === "admin" ? "admin" : "user";
    await db`
      insert into user_module_roles (user_id, module_id, role)
      values (${userId}, 'tasks', ${taskRole})
      on conflict (user_id, module_id) do nothing
    `;
    if (platformRole === "admin") {
      await db`
        insert into user_module_roles (user_id, module_id, role)
        values (${userId}, 'dovrut', 'admin')
        on conflict (user_id, module_id) do nothing
      `;
    }
  }
}
