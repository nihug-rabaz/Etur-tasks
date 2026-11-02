import { BaseService } from "@/services/base.service";

export interface DovrutWorkflowPhones {
  branch_head: string;
  deputy_commander: string;
  chief_rabbi: string;
  idf_spokesperson: string;
}

export interface DovrutWorkflowSettings {
  phones: DovrutWorkflowPhones;
  news_keywords: string[];
  updated_at: string | null;
}

const EMPTY_PHONES: DovrutWorkflowPhones = {
  branch_head: "",
  deputy_commander: "",
  chief_rabbi: "",
  idf_spokesperson: "",
};

function normalizePhones(raw: unknown): DovrutWorkflowPhones {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    branch_head: typeof obj.branch_head === "string" ? obj.branch_head : "",
    deputy_commander: typeof obj.deputy_commander === "string" ? obj.deputy_commander : "",
    chief_rabbi: typeof obj.chief_rabbi === "string" ? obj.chief_rabbi : "",
    idf_spokesperson: typeof obj.idf_spokesperson === "string" ? obj.idf_spokesperson : "",
  };
}

export class DovrutWorkflowSettingsService extends BaseService {
  public async get(): Promise<DovrutWorkflowSettings> {
    const db = this.getDb();
    const rows = await db<{ phones: unknown; news_keywords: string[] | null; updated_at: string }[]>`
      select phones, news_keywords, updated_at
      from dovrut_workflow_settings
      where id = 1
      limit 1
    `;
    const row = rows[0];
    if (!row) {
      return { phones: { ...EMPTY_PHONES }, news_keywords: [], updated_at: null };
    }
    return {
      phones: normalizePhones(row.phones),
      news_keywords: row.news_keywords ?? [],
      updated_at: row.updated_at ?? null,
    };
  }

  public async update(input: {
    phones?: Partial<DovrutWorkflowPhones>;
    news_keywords?: string[];
  }): Promise<DovrutWorkflowSettings> {
    const current = await this.get();
    const phones: DovrutWorkflowPhones = {
      ...current.phones,
      ...(input.phones ?? {}),
    };
    const news_keywords = input.news_keywords ?? current.news_keywords;
    const db = this.getDb();
    await db`
      insert into dovrut_workflow_settings (id, phones, news_keywords, updated_at)
      values (1, ${JSON.stringify(phones)}::jsonb, ${news_keywords}, now())
      on conflict (id) do update set
        phones = excluded.phones,
        news_keywords = excluded.news_keywords,
        updated_at = now()
    `;
    return this.get();
  }
}
