import { BaseService } from "@/services/base.service";
import type { DovrutAudienceMessage, DovrutDomain } from "@/modules/dovrut/types";

export class DovrutAudienceMessageService extends BaseService {
  public async list(audience?: string): Promise<DovrutAudienceMessage[]> {
    const db = this.getDb();
    return db<DovrutAudienceMessage[]>`
      select * from dovrut_audience_messages
      where (${audience ?? null}::text is null or audience = ${audience ?? null})
      order by updated_at desc
    `;
  }

  /** Messages whose audience is in `audiences` and domain is null or in `domains`. */
  public async listByAudiencesDomains(
    audiences: string[],
    domains: Array<DovrutDomain | string>,
  ): Promise<DovrutAudienceMessage[]> {
    if (audiences.length === 0) return [];
    const db = this.getDb();
    const domainList = domains.filter(Boolean);
    return db<DovrutAudienceMessage[]>`
      select * from dovrut_audience_messages
      where audience = any(${audiences}::text[])
        and (
          domain is null
          or ${domainList.length} = 0
          or domain = any(${domainList}::text[])
        )
      order by updated_at desc
    `;
  }

  public async create(input: {
    audience: string;
    domain?: DovrutDomain | null;
    title: string;
    body?: string;
    created_by: string;
  }): Promise<DovrutAudienceMessage> {
    const db = this.getDb();
    const rows = await db<DovrutAudienceMessage[]>`
      insert into dovrut_audience_messages (audience, domain, title, body, created_by)
      values (
        ${input.audience},
        ${input.domain ?? null},
        ${input.title},
        ${input.body ?? ""},
        ${input.created_by}
      )
      returning *
    `;
    return rows[0];
  }

  public async delete(id: string): Promise<boolean> {
    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      delete from dovrut_audience_messages where id = ${id} returning id
    `;
    return rows.length > 0;
  }
}
