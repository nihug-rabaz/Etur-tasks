import { BaseService } from "@/services/base.service";
import type { DovrutProject, DovrutProjectStatus } from "@/modules/dovrut/types";

export class DovrutProjectService extends BaseService {
  public async list(): Promise<DovrutProject[]> {
    const db = this.getDb();
    return db<DovrutProject[]>`
      select p.*, c.name as campaign_name
      from dovrut_projects p
      left join dovrut_campaigns c on c.id = p.campaign_id
      order by p.updated_at desc
    `;
  }

  public async listActive(): Promise<DovrutProject[]> {
    const db = this.getDb();
    return db<DovrutProject[]>`
      select p.*, c.name as campaign_name
      from dovrut_projects p
      left join dovrut_campaigns c on c.id = p.campaign_id
      where p.status = 'active'
      order by p.updated_at desc
    `;
  }

  public async getById(id: string): Promise<DovrutProject | null> {
    const db = this.getDb();
    const rows = await db<DovrutProject[]>`
      select p.*, c.name as campaign_name
      from dovrut_projects p
      left join dovrut_campaigns c on c.id = p.campaign_id
      where p.id = ${id}
      limit 1
    `;
    return rows[0] ?? null;
  }

  public async create(input: {
    name: string;
    description?: string | null;
    target_audiences?: string[];
    status?: DovrutProjectStatus;
    campaign_id?: string | null;
    created_by: string;
  }): Promise<DovrutProject> {
    const db = this.getDb();
    const rows = await db<DovrutProject[]>`
      insert into dovrut_projects (name, description, target_audiences, status, campaign_id, created_by)
      values (
        ${input.name},
        ${input.description ?? null},
        ${input.target_audiences ?? []},
        ${input.status ?? "active"},
        ${input.campaign_id ?? null},
        ${input.created_by}
      )
      returning *
    `;
    return (await this.getById(rows[0].id))!;
  }

  public async update(
    id: string,
    input: Partial<{
      name: string;
      description: string | null;
      target_audiences: string[];
      status: DovrutProjectStatus;
      campaign_id: string | null;
    }>,
  ): Promise<DovrutProject | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    const db = this.getDb();
    await db`
      update dovrut_projects set
        name = ${input.name ?? existing.name},
        description = ${input.description !== undefined ? input.description : existing.description},
        target_audiences = ${input.target_audiences ?? existing.target_audiences},
        status = ${input.status ?? existing.status},
        campaign_id = ${
          input.campaign_id !== undefined ? input.campaign_id : existing.campaign_id
        },
        updated_at = now()
      where id = ${id}
    `;
    return this.getById(id);
  }

  public async delete(id: string): Promise<boolean> {
    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      delete from dovrut_projects where id = ${id} returning id
    `;
    return rows.length > 0;
  }
}
