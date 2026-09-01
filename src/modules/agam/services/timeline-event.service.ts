import { BaseService } from "@/services/base.service";
import type { AgamTimelineEventItem } from "@/modules/agam/types";

export class AgamTimelineEventService extends BaseService {
  public async getById(id: string): Promise<AgamTimelineEventItem | null> {
    const db = this.getDb();
    const rows = await db<AgamTimelineEventItem[]>`
      select * from agam_timeline_events where id = ${id} limit 1
    `;
    return rows[0] ?? null;
  }

  public async list(limit = 20): Promise<AgamTimelineEventItem[]> {
    const db = this.getDb();
    return db<AgamTimelineEventItem[]>`
      select * from agam_timeline_events
      order by event_date asc, created_at asc
      limit ${limit}
    `;
  }

  public async create(input: {
    title: string;
    event_date: string;
    event_type: AgamTimelineEventItem["event_type"];
    notes?: string | null;
    created_by_id?: string | null;
  }): Promise<AgamTimelineEventItem> {
    const db = this.getDb();
    const rows = await db<AgamTimelineEventItem[]>`
      insert into agam_timeline_events (title, event_date, event_type, notes, created_by_id)
      values (${input.title}, ${input.event_date}, ${input.event_type}, ${input.notes ?? null}, ${input.created_by_id ?? null})
      returning *
    `;
    return rows[0];
  }

  public async update(id: string, input: {
    title: string;
    event_date: string;
    event_type: AgamTimelineEventItem["event_type"];
    notes?: string | null;
  }): Promise<AgamTimelineEventItem> {
    const db = this.getDb();
    const rows = await db<AgamTimelineEventItem[]>`
      update agam_timeline_events set
        title = ${input.title},
        event_date = ${input.event_date},
        event_type = ${input.event_type},
        notes = ${input.notes ?? null},
        updated_at = now()
      where id = ${id}
      returning *
    `;
    return rows[0];
  }

  public async delete(id: string): Promise<void> {
    const db = this.getDb();
    await db`delete from agam_timeline_events where id = ${id}`;
  }
}
