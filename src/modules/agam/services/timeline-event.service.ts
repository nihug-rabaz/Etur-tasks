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

  public async list(limit = 100): Promise<AgamTimelineEventItem[]> {
    const db = this.getDb();
    return db<AgamTimelineEventItem[]>`
      select * from agam_timeline_events
      order by sort_order asc, event_date asc nulls last, created_at asc
      limit ${limit}
    `;
  }

  public async create(input: {
    title: string;
    event_date?: string | null;
    event_type: AgamTimelineEventItem["event_type"];
    notes?: string | null;
    sort_order?: number;
    created_by_id?: string | null;
  }): Promise<AgamTimelineEventItem> {
    const db = this.getDb();
    const rows = await db<AgamTimelineEventItem[]>`
      insert into agam_timeline_events (title, event_date, event_type, notes, sort_order, created_by_id)
      values (
        ${input.title},
        ${input.event_date ?? null},
        ${input.event_type},
        ${input.notes ?? null},
        ${input.sort_order ?? 0},
        ${input.created_by_id ?? null}
      )
      returning *
    `;
    return rows[0];
  }

  public async update(
    id: string,
    input: {
      title?: string;
      event_date?: string | null;
      event_type?: AgamTimelineEventItem["event_type"];
      notes?: string | null;
      sort_order?: number;
    },
  ): Promise<AgamTimelineEventItem> {
    const existing = await this.getById(id);
    if (!existing) throw new Error("NOT_FOUND");
    const db = this.getDb();
    const rows = await db<AgamTimelineEventItem[]>`
      update agam_timeline_events set
        title = ${input.title ?? existing.title},
        event_date = ${input.event_date !== undefined ? input.event_date : existing.event_date},
        event_type = ${input.event_type ?? existing.event_type},
        notes = ${input.notes !== undefined ? input.notes : existing.notes},
        sort_order = ${input.sort_order ?? existing.sort_order ?? 0},
        updated_at = now()
      where id = ${id}
      returning *
    `;
    return rows[0];
  }

  public async updateDate(id: string, eventDate: string | null): Promise<AgamTimelineEventItem> {
    return this.update(id, { event_date: eventDate });
  }

  public async delete(id: string): Promise<void> {
    const db = this.getDb();
    await db`delete from agam_timeline_events where id = ${id}`;
  }
}
