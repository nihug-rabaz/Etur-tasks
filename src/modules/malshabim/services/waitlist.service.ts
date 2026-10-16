import { BaseService } from "@/services/base.service";

export interface MalshabimWaitlistEntry {
  id: string;
  full_name: string;
  phone: string;
  created_by: string | null;
  created_at: string;
}

export class MalshabimWaitlistService extends BaseService {
  public async list(limit = 500): Promise<MalshabimWaitlistEntry[]> {
    const db = this.getDb();
    return db<MalshabimWaitlistEntry[]>`
      select *
      from malshabim_interview_waitlist
      order by created_at desc
      limit ${limit}
    `;
  }

  public async count(): Promise<number> {
    const db = this.getDb();
    const rows = await db<{ n: number }[]>`
      select count(*)::int as n from malshabim_interview_waitlist
    `;
    return rows[0]?.n ?? 0;
  }

  public async getById(id: string): Promise<MalshabimWaitlistEntry | null> {
    const db = this.getDb();
    const rows = await db<MalshabimWaitlistEntry[]>`
      select * from malshabim_interview_waitlist
      where id = ${id}
      limit 1
    `;
    return rows[0] ?? null;
  }

  public async create(input: {
    full_name: string;
    phone: string;
    created_by?: string | null;
  }): Promise<MalshabimWaitlistEntry> {
    const db = this.getDb();
    const rows = await db<MalshabimWaitlistEntry[]>`
      insert into malshabim_interview_waitlist (full_name, phone, created_by)
      values (
        ${input.full_name.trim()},
        ${input.phone.trim()},
        ${input.created_by ?? null}
      )
      returning *
    `;
    return rows[0];
  }

  public async delete(id: string): Promise<boolean> {
    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      delete from malshabim_interview_waitlist
      where id = ${id}
      returning id
    `;
    return rows.length > 0;
  }
}
