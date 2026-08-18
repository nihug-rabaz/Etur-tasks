import { BaseService } from "@/services/base.service";
import type { DovrutListScope } from "@/modules/dovrut/lib/record-scope";
import type { DovrutProject, DovrutProjectStatus } from "@/modules/dovrut/types";

export class DovrutProjectService extends BaseService {
  public async list(filters?: {
    scope?: DovrutListScope;
    status?: DovrutProjectStatus;
    campaignId?: string;
  }): Promise<DovrutProject[]> {
    const db = this.getDb();
    const scope = filters?.scope ?? "working";
    const status = filters?.status ?? null;
    const campaignId = filters?.campaignId || null;
    return db<DovrutProject[]>`
      select p.*, c.name as campaign_name
      from dovrut_projects p
      left join dovrut_campaigns c on c.id = p.campaign_id
      where (
        ${scope} = 'deleted' and p.deleted_at is not null
        or ${scope} = 'drafts' and p.deleted_at is null and p.status = 'draft'
        or ${scope} = 'archived' and p.deleted_at is null and p.status = 'completed'
        or ${scope} = 'working' and p.deleted_at is null and p.status in ('active', 'on_hold')
      )
        and (${status}::text is null or p.status = ${status})
        and (${campaignId}::uuid is null or p.campaign_id = ${campaignId})
      order by p.updated_at desc
    `;
  }

  public async listActive(): Promise<DovrutProject[]> {
    return this.list({ scope: "working", status: "active" });
  }

  public async getById(id: string, includeDeleted = false): Promise<DovrutProject | null> {
    const db = this.getDb();
    const rows = await db<DovrutProject[]>`
      select p.*, c.name as campaign_name
      from dovrut_projects p
      left join dovrut_campaigns c on c.id = p.campaign_id
      where p.id = ${id}
        and (${includeDeleted}::boolean or p.deleted_at is null)
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
      ended_at: string | null;
    }>,
  ): Promise<DovrutProject | null> {
    const existing = await this.getById(id, true);
    if (!existing || existing.deleted_at) return null;
    const nextStatus = input.status ?? existing.status;
    const endedAt =
      nextStatus === "completed"
        ? input.ended_at ?? existing.ended_at ?? new Date().toISOString()
        : input.ended_at !== undefined
          ? input.ended_at
          : existing.ended_at;
    const db = this.getDb();
    await db`
      update dovrut_projects set
        name = ${input.name ?? existing.name},
        description = ${input.description !== undefined ? input.description : existing.description},
        target_audiences = ${input.target_audiences ?? existing.target_audiences ?? []},
        status = ${nextStatus},
        campaign_id = ${
          input.campaign_id !== undefined ? input.campaign_id : existing.campaign_id
        },
        ended_at = ${endedAt},
        updated_at = now()
      where id = ${id} and deleted_at is null
    `;
    return this.getById(id);
  }

  public async touchUpdated(id: string): Promise<void> {
    const db = this.getDb();
    await db`
      update dovrut_projects
      set updated_at = now()
      where id = ${id} and deleted_at is null
    `;
  }

  public async completeDueProjects(): Promise<number> {
    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      update dovrut_projects
      set status = 'completed',
          ended_at = coalesce(ended_at, now()),
          updated_at = now()
      where deleted_at is null
        and status = 'active'
        and ended_at is not null
        and ended_at::date <= (timezone('Asia/Jerusalem', now()))::date
      returning id
    `;
    return rows.length;
  }

  public async softDelete(id: string): Promise<boolean> {
    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      update dovrut_projects
      set deleted_at = now(), updated_at = now()
      where id = ${id} and deleted_at is null
      returning id
    `;
    return rows.length > 0;
  }

  public async restore(id: string): Promise<boolean> {
    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      update dovrut_projects
      set deleted_at = null, updated_at = now()
      where id = ${id} and deleted_at is not null
      returning id
    `;
    return rows.length > 0;
  }

  public async purge(id: string): Promise<boolean> {
    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      delete from dovrut_projects where id = ${id} returning id
    `;
    return rows.length > 0;
  }

  public async delete(id: string): Promise<boolean> {
    return this.softDelete(id);
  }
}
