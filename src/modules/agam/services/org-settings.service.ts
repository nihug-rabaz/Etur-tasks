import { BaseService } from "@/services/base.service";
import type { AgamOrgSettings } from "@/modules/agam/types";

export class AgamOrgSettingsService extends BaseService {
  public async getSingleton(): Promise<AgamOrgSettings | null> {
    const db = this.getDb();
    const rows = await db<AgamOrgSettings[]>`
      select * from agam_org_settings limit 1
    `;
    return rows[0] ?? null;
  }

  public async upsert(unitName: string, logoUrl?: string | null): Promise<AgamOrgSettings> {
    const existing = await this.getSingleton();
    const db = this.getDb();
    if (existing) {
      const rows = await db<AgamOrgSettings[]>`
        update agam_org_settings set
          unit_name = ${unitName},
          logo_url = ${logoUrl !== undefined ? logoUrl : existing.logo_url},
          updated_at = now()
        where id = ${existing.id}
        returning *
      `;
      return rows[0];
    }
    const rows = await db<AgamOrgSettings[]>`
      insert into agam_org_settings (unit_name, logo_url)
      values (${unitName}, ${logoUrl ?? null})
      returning *
    `;
    return rows[0];
  }
}
