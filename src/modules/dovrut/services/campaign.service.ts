import { BaseService } from "@/services/base.service";
import type { DovrutCampaign, DovrutCampaignStatus } from "@/modules/dovrut/types";
import type { DovrutListScope } from "@/modules/dovrut/lib/record-scope";

const RESTORE_WINDOW_DAYS = 30;

export class DovrutCampaignService extends BaseService {
  public async list(scope: DovrutListScope = "working"): Promise<DovrutCampaign[]> {
    const db = this.getDb();
    return db<DovrutCampaign[]>`
      select * from dovrut_campaigns
      where
        ${scope} = 'deleted' and deleted_at is not null
          and deleted_at > now() - (${RESTORE_WINDOW_DAYS}::int * interval '1 day')
        or ${scope} <> 'deleted' and deleted_at is null
      order by updated_at desc
    `;
  }

  public async getById(id: string): Promise<DovrutCampaign | null> {
    const db = this.getDb();
    const rows = await db<DovrutCampaign[]>`
      select * from dovrut_campaigns where id = ${id} limit 1
    `;
    return rows[0] ?? null;
  }

  public async create(input: {
    name: string;
    description?: string | null;
    status?: DovrutCampaignStatus;
    created_by: string;
  }): Promise<DovrutCampaign> {
    const db = this.getDb();
    const rows = await db<DovrutCampaign[]>`
      insert into dovrut_campaigns (name, description, status, created_by)
      values (
        ${input.name},
        ${input.description ?? null},
        ${input.status ?? "active"},
        ${input.created_by}
      )
      returning *
    `;
    return rows[0];
  }

  public async update(
    id: string,
    input: Partial<{ name: string; description: string | null; status: DovrutCampaignStatus }>,
  ): Promise<DovrutCampaign | null> {
    const existing = await this.getById(id);
    if (!existing || existing.deleted_at) return null;
    const db = this.getDb();
    const rows = await db<DovrutCampaign[]>`
      update dovrut_campaigns set
        name = ${input.name ?? existing.name},
        description = ${input.description !== undefined ? input.description : existing.description},
        status = ${input.status ?? existing.status},
        updated_at = now()
      where id = ${id} and deleted_at is null
      returning *
    `;
    return rows[0] ?? null;
  }

  // Soft-delete campaign to draft and move linked projects to draft for 30-day restore.
  public async softDelete(id: string): Promise<boolean> {
    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      update dovrut_campaigns
      set status = 'draft', deleted_at = now(), updated_at = now()
      where id = ${id} and deleted_at is null
      returning id
    `;
    if (rows.length === 0) return false;
    await db`
      update dovrut_projects
      set status = 'draft', updated_at = now()
      where campaign_id = ${id} and deleted_at is null and status <> 'draft'
    `;
    return true;
  }

  public async restore(id: string): Promise<boolean> {
    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      update dovrut_campaigns
      set deleted_at = null, status = 'active', updated_at = now()
      where id = ${id}
        and deleted_at is not null
        and deleted_at > now() - (${RESTORE_WINDOW_DAYS}::int * interval '1 day')
      returning id
    `;
    if (rows.length === 0) return false;
    await db`
      update dovrut_projects
      set status = 'active', updated_at = now()
      where campaign_id = ${id} and deleted_at is null and status = 'draft'
    `;
    return true;
  }

  public async purge(id: string): Promise<boolean> {
    const db = this.getDb();
    await db`
      update dovrut_projects
      set campaign_id = null, updated_at = now()
      where campaign_id = ${id}
    `;
    const rows = await db<{ id: string }[]>`
      delete from dovrut_campaigns where id = ${id} returning id
    `;
    return rows.length > 0;
  }

  public async delete(id: string): Promise<boolean> {
    return this.softDelete(id);
  }

  public async purgeExpired(days = RESTORE_WINDOW_DAYS): Promise<number> {
    const db = this.getDb();
    const expired = await db<{ id: string }[]>`
      select id from dovrut_campaigns
      where deleted_at is not null
        and deleted_at <= now() - (${days}::int * interval '1 day')
    `;
    for (const row of expired) {
      await this.purge(row.id);
    }
    return expired.length;
  }
}
