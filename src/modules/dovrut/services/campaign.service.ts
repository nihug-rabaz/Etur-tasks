import { BaseService } from "@/services/base.service";
import type { DovrutCampaign, DovrutCampaignStatus } from "@/modules/dovrut/types";

export class DovrutCampaignService extends BaseService {
  public async list(): Promise<DovrutCampaign[]> {
    const db = this.getDb();
    return db<DovrutCampaign[]>`
      select * from dovrut_campaigns order by updated_at desc
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
    if (!existing) return null;
    const db = this.getDb();
    const rows = await db<DovrutCampaign[]>`
      update dovrut_campaigns set
        name = ${input.name ?? existing.name},
        description = ${input.description !== undefined ? input.description : existing.description},
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
      delete from dovrut_campaigns where id = ${id} returning id
    `;
    return rows.length > 0;
  }
}
