import { BaseService } from "@/services/base.service";
import type { DovrutProject, DovrutProjectStatus } from "@/modules/dovrut/types";

export class DovrutProjectService extends BaseService {
  public async list(): Promise<DovrutProject[]> {
    const db = this.getDb();
    return db<DovrutProject[]>`
      select *
      from dovrut_projects
      order by updated_at desc
    `;
  }

  public async getById(id: string): Promise<DovrutProject | null> {
    const db = this.getDb();
    const rows = await db<DovrutProject[]>`
      select * from dovrut_projects where id = ${id} limit 1
    `;
    return rows[0] ?? null;
  }

  public async create(input: {
    name: string;
    description?: string | null;
    target_audiences?: string[];
    status?: DovrutProjectStatus;
    created_by: string;
  }): Promise<DovrutProject> {
    const db = this.getDb();
    const rows = await db<DovrutProject[]>`
      insert into dovrut_projects (name, description, target_audiences, status, created_by)
      values (
        ${input.name},
        ${input.description ?? null},
        ${input.target_audiences ?? []},
        ${input.status ?? "active"},
        ${input.created_by}
      )
      returning *
    `;
    return rows[0];
  }

  public async update(
    id: string,
    input: Partial<{
      name: string;
      description: string | null;
      target_audiences: string[];
      status: DovrutProjectStatus;
    }>,
  ): Promise<DovrutProject | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    const db = this.getDb();
    const rows = await db<DovrutProject[]>`
      update dovrut_projects set
        name = ${input.name ?? existing.name},
        description = ${input.description !== undefined ? input.description : existing.description},
        target_audiences = ${input.target_audiences ?? existing.target_audiences},
        status = ${input.status ?? existing.status},
        updated_at = now()
      where id = ${id}
      returning *
    `;
    return rows[0] ?? null;
  }

  public async delete(id: string): Promise<boolean> {
    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      delete from dovrut_projects where id = ${id} returning id
    `;
    return rows.length > 0;
  }
}
